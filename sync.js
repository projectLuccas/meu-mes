
const FINANCE_CACHE_PREFIX = "meuMesCache_";

window.financeReady = false;
window.financeUserId = null;

let syncTimer = null;
let syncRunning = false;
let syncPending = false;
let lastSyncedData = null;

function financeCacheKey(userId) {
    return FINANCE_CACHE_PREFIX + userId;
}

function cloneFinanceData(data) {
    return JSON.parse(JSON.stringify(data));
}

function emptyFinanceData() {
    return {
        "2026-10": {
            incomes: [],
            expenses: []
        }
    };
}

function normalizeFinanceData(data) {
    const result = emptyFinanceData();

    for (const [month, records] of Object.entries(data || {})) {
        if (!/^\d{4}-\d{2}$/.test(month) || month < "2026-10") {
            continue;
        }

        result[month] = {
            incomes: Array.isArray(records?.incomes)
                ? records.incomes
                : [],
            expenses: Array.isArray(records?.expenses)
                ? records.expenses
                : []
        };
    }

    return result;
}

function setFinanceStatus(message) {
    let status = document.getElementById("financeSyncStatus");

    if (!status) {
        status = document.createElement("p");
        status.id = "financeSyncStatus";
        status.setAttribute("role", "status");
        status.style.fontSize = "13px";
        status.style.padding = "8px";
        status.style.textAlign = "center";

        const header = document.querySelector(".header");
        header?.appendChild(status);
    }

    status.textContent = message;
}

async function checkFinanceError(result) {
    if (result.error) {
        throw result.error;
    }

    return result.data;
}

async function fetchAllFinanceRows(table) {
    const all = [];
    const pageSize = 500;

    for (let start = 0; ; start += pageSize) {
        const rows = await checkFinanceError(
            await supabaseClient
                .from(table)
                .select("*")
                .eq("user_id", window.financeUserId)
                .range(start, start + pageSize - 1)
        );

        all.push(...rows);

        if (rows.length < pageSize) break;
    }

    return all;
}

async function loadFinanceFromCloud() {
    const [months, incomes, expenses] = await Promise.all([
        fetchAllFinanceRows("months"),
        fetchAllFinanceRows("incomes"),
        fetchAllFinanceRows("expenses")
    ]);

    const data = emptyFinanceData();

    function ensureMonth(key) {
        if (key >= "2026-10" && /^\d{4}-\d{2}$/.test(key)) {
            data[key] ||= { incomes: [], expenses: [] };
        }
    }

    months.forEach(row => ensureMonth(row.month_key));

    incomes.forEach(row => {
        ensureMonth(row.month_key);

        if (data[row.month_key]) {
            data[row.month_key].incomes.push({
                id: row.id,
                description: row.description,
                value: Number(row.value),
                date: row.transaction_date
            });
        }
    });

    expenses.forEach(row => {
        ensureMonth(row.month_key);

        if (data[row.month_key]) {
            data[row.month_key].expenses.push({
                id: row.id,
                description: row.description,
                value: Number(row.value),
                date: row.transaction_date,
                status: row.status
            });
        }
    });

    return data;
}

function isUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function prepareFinanceData(data) {
    const prepared = normalizeFinanceData(data);

    for (const month of Object.values(prepared)) {
        for (const item of [...month.incomes, ...month.expenses]) {
            if (!isUUID(item.id)) {
                item.id = crypto.randomUUID();
            }
        }
    }

    return prepared;
}

function rowsForTable(data, table) {
    const rows = [];

    for (const [monthKey, month] of Object.entries(data)) {
        const list = table === "incomes"
            ? month.incomes
            : month.expenses;

        for (const item of list) {
            const row = {
                id: item.id,
                user_id: window.financeUserId,
                month_key: monthKey,
                description: item.description,
                value: Number(item.value),
                transaction_date: item.date
            };

            if (table === "expenses") {
                row.status = item.status || "pending";
            }

            rows.push(row);
        }
    }

    return rows;
}

async function writeFinanceChanges(previous, current) {
    const userId = window.financeUserId;

    const previousMonths = new Set(Object.keys(previous));
    const currentMonths = new Set(Object.keys(current));

    // Criar meses antes de inserir registros.
    for (const month of currentMonths) {
        if (!previousMonths.has(month)) {
            await checkFinanceError(
                await supabaseClient
                    .from("months")
                    .upsert(
                        { user_id: userId, month_key: month },
                        { onConflict: "user_id,month_key" }
                    )
            );
        }
    }

    for (const table of ["incomes", "expenses"]) {
        const oldRows = rowsForTable(previous, table);
        const newRows = rowsForTable(current, table);

        const oldById = new Map(oldRows.map(row => [row.id, row]));
        const newById = new Map(newRows.map(row => [row.id, row]));

        const changed = newRows.filter(row =>
            !oldById.has(row.id) ||
            JSON.stringify(oldById.get(row.id)) !== JSON.stringify(row)
        );

        const deleted = oldRows.filter(row => !newById.has(row.id));

        for (const row of changed) {
            await checkFinanceError(
                await supabaseClient
                    .from(table)
                    .upsert(row, { onConflict: "id" })
            );
        }

        for (const row of deleted) {
            await checkFinanceError(
                await supabaseClient
                    .from(table)
                    .delete()
                    .eq("id", row.id)
                    .eq("user_id", userId)
            );
        }
    }

    // Excluir meses somente depois dos registros.
    for (const month of previousMonths) {
        if (month !== "2026-10" && !currentMonths.has(month)) {
            await checkFinanceError(
                await supabaseClient
                    .from("months")
                    .delete()
                    .eq("user_id", userId)
                    .eq("month_key", month)
            );
        }
    }
}

async function runFinanceSync() {
    if (!window.financeReady || !window.financeUserId) return;

    if (syncRunning) {
        syncPending = true;
        return;
    }

    syncRunning = true;

    try {
        do {
            syncPending = false;

            const target = prepareFinanceData(
                cloneFinanceData(financialData)
            );

            setFinanceStatus("Salvando na nuvem...");

            await writeFinanceChanges(lastSyncedData, target);

            lastSyncedData = cloneFinanceData(target);

            localStorage.setItem(
                financeCacheKey(window.financeUserId),
                JSON.stringify(target)
            );

            if (JSON.stringify(financialData) !== JSON.stringify(target)) {
                syncPending = true;
            }
        } while (syncPending);

        setFinanceStatus("Dados salvos na nuvem");
    } catch (error) {
        console.error("Erro de sincronização:", error);
        setFinanceStatus("Erro ao sincronizar. Não feche sem verificar.");
    } finally {
        syncRunning = false;
    }
}

window.queueFinanceSync = function () {
    if (!window.financeReady) return;

    clearTimeout(syncTimer);

    syncTimer = setTimeout(() => {
        runFinanceSync();
    }, 400);
};

async function startFinanceForUser(user) {
    window.financeReady = false;
    window.financeUserId = user.id;

    setFinanceStatus("Carregando seus dados...");

    const cloudData = await loadFinanceFromCloud();

    financialData = normalizeFinanceData(cloudData);
    lastSyncedData = cloneFinanceData(financialData);

    localStorage.setItem(
        financeCacheKey(user.id),
        JSON.stringify(financialData)
    );

    window.financeReady = true;

    init();
    showAppScreen();

    setFinanceStatus("Conectado à nuvem");
}

function stopFinance() {
    window.financeReady = false;
    window.financeUserId = null;

    clearTimeout(syncTimer);
    lastSyncedData = null;
    financialData = emptyFinanceData();

    showLoginScreen();
}


/* =========================================
   IMPORTAÇÃO SEGURA DOS DADOS ANTIGOS
========================================= */

function getLegacyFinanceData() {
    const raw = localStorage.getItem("meuMesDataV3");

    if (!raw) {
        throw new Error(
            "Não foram encontrados dados antigos neste navegador."
        );
    }

    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(
            "Os dados antigos existem, mas não estão em um formato válido."
        );
    }

    if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
    ) {
        throw new Error("Formato dos dados antigos inválido.");
    }

    return { raw, parsed };
}

function downloadLegacyBackup(raw) {
    const blob = new Blob([raw], {
        type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "dinheiro-do-mes-backup-antigo.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function legacyFingerprint(type, item, monthKey) {
    return JSON.stringify([
        type,
        monthKey,
        String(item.description || "").trim(),
        Number(item.value),
        String(item.date || ""),
        type === "expenses"
            ? String(item.status || "pending")
            : ""
    ]);
}

function validateLegacyItem(item, monthKey) {
    if (!item || typeof item !== "object") {
        return false;
    }

    return (
        typeof item.description === "string" &&
        item.description.trim().length > 0 &&
        Number.isFinite(Number(item.value)) &&
        Number(item.value) > 0 &&
        typeof item.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        item.date.slice(0, 7) === monthKey
    );
}

async function importLegacyFinanceData() {
    if (!window.financeReady || !window.financeUserId) {
        alert("Entre na sua conta antes de importar.");
        return;
    }

    if (syncRunning || syncTimer) {
        alert(
            "Aguarde a sincronização terminar e tente novamente."
        );
        return;
    }

    const userId = window.financeUserId;

    let legacy;

    try {
        legacy = getLegacyFinanceData();
    } catch (error) {
        alert(error.message);
        return;
    }

    const validMonths = Object.entries(legacy.parsed)
        .filter(([key, month]) =>
            /^\d{4}-(0[1-9]|1[0-2])$/.test(key) &&
            key >= "2026-10" &&
            month &&
            typeof month === "object" &&
            !Array.isArray(month)
        );

    const totalIncomes = validMonths.reduce(
        (total, [, month]) =>
            total + (Array.isArray(month.incomes)
                ? month.incomes.length : 0),
        0
    );

    const totalExpenses = validMonths.reduce(
        (total, [, month]) =>
            total + (Array.isArray(month.expenses)
                ? month.expenses.length : 0),
        0
    );

    if (
        !confirm(
            "DADOS ANTIGOS ENCONTRADOS!\n\n" +
            `Meses: ${validMonths.length}\n` +
            `Ganhos: ${totalIncomes}\n` +
            `Gastos: ${totalExpenses}\n\n` +
            "Deseja preparar a importação?"
        )
    ) {
        return;
    }

    // Backup dos dados originais, antes de qualquer alteração.
    downloadLegacyBackup(legacy.raw);

    if (
        !confirm(
            "Foi solicitado o download do backup.\n\n" +
            "Verifique se o arquivo JSON foi realmente salvo " +
            "no seu celular antes de continuar.\n\n" +
            "Você confirmou que o backup está salvo?"
        )
    ) {
        return;
    }

    if (
        !confirm(
            "CONFIRMAR IMPORTAÇÃO\n\n" +
            "Os registros serão adicionados à sua conta.\n" +
            "Registros com os mesmos dados de outro já existente " +
            "serão ignorados.\n\n" +
            "O armazenamento antigo não será apagado.\n\n" +
            "Deseja continuar?"
        )
    ) {
        return;
    }

    const button = document.getElementById(
        "importLegacyFinanceButton"
    );

    let inserted = 0;
    let skipped = 0;
    let invalid = 0;
    let errorMessage = null;

    button.disabled = true;
    window.financeReady = false;

    try {
        setFinanceStatus("Lendo registros da nuvem...");

        const cloud = await loadFinanceFromCloud();

        const fingerprints = new Set();
        const existingIds = new Set();

        for (const [monthKey, month] of Object.entries(cloud)) {
            for (const type of ["incomes", "expenses"]) {
                for (const item of month[type]) {
                    fingerprints.add(
                        legacyFingerprint(type, item, monthKey)
                    );

                    existingIds.add(item.id);
                }
            }
        }

        for (const [monthKey, month] of validMonths) {
            const { data: sessionData, error: sessionError } =
                await supabaseClient.auth.getUser();

            if (
                sessionError ||
                sessionData.user?.id !== userId
            ) {
                throw new Error(
                    "A sessão mudou durante a importação."
                );
            }

            // Garante que o mês exista na nuvem.
            await checkFinanceError(
                await supabaseClient
                    .from("months")
                    .upsert(
                        {
                            user_id: userId,
                            month_key: monthKey
                        },
                        {
                            onConflict: "user_id,month_key"
                        }
                    )
            );

            for (const type of ["incomes", "expenses"]) {
                const records = Array.isArray(month[type])
                    ? month[type]
                    : [];

                for (const item of records) {
                    if (!validateLegacyItem(item, monthKey)) {
                        invalid++;
                        continue;
                    }

                    const fingerprint = legacyFingerprint(
                        type,
                        item,
                        monthKey
                    );

                    if (fingerprints.has(fingerprint)) {
                        skipped++;
                        continue;
                    }

                    const id =
                        isUUID(item.id) && !existingIds.has(item.id)
                            ? item.id
                            : crypto.randomUUID();

                    const row = {
                        id,
                        user_id: userId,
                        month_key: monthKey,
                        description: item.description.trim(),
                        value: Number(item.value),
                        transaction_date: item.date
                    };

                    if (type === "expenses") {
                        row.status = item.status === "paid"
                            ? "paid"
                            : "pending";
                    }

                    setFinanceStatus(
                        `Importando registros... ${inserted} enviados`
                    );

                    await checkFinanceError(
                        await supabaseClient
                            .from(type)
                            .insert(row)
                    );

                    inserted++;
                    existingIds.add(id);
                    fingerprints.add(fingerprint);
                }
            }
        }
    } catch (error) {
        console.error("Falha na importação:", error);
        errorMessage = error.message;
    } finally {
        // Recarrega a situação real da nuvem, inclusive se
        // a importação tiver sido interrompida parcialmente.
        try {
            await startFinanceForUser({ id: userId });
        } catch (reloadError) {
            console.error("Falha ao recarregar:", reloadError);
            window.financeReady = false;
            errorMessage = (
                errorMessage || "Não foi possível recarregar a nuvem."
            );
        }

        button.disabled = false;
    }

    if (errorMessage) {
        setFinanceStatus("Importação interrompida. Verifique os dados.");

        alert(
            "A importação foi interrompida.\n\n" +
            `Registros enviados: ${inserted}\n` +
            `Duplicados ignorados: ${skipped}\n` +
            `Registros inválidos: ${invalid}\n\n` +
            `Erro: ${errorMessage}\n\n` +
            "Seus dados antigos e o backup foram preservados. " +
            "Não repita a operação antes de conferir o resultado."
        );

        return;
    }

    setFinanceStatus("Importação concluída");

    alert(
        "IMPORTAÇÃO FINALIZADA!\n\n" +
        `Registros importados: ${inserted}\n` +
        `Duplicados ignorados: ${skipped}\n` +
        `Registros inválidos: ${invalid}\n\n` +
        "Seus dados antigos continuam no navegador."
    );
}

// Cria o botão sem exigir alterações no HTML.
function createLegacyImportButton() {
    if (document.getElementById("importLegacyFinanceButton")) {
        return;
    }

    const button = document.createElement("button");

    button.id = "importLegacyFinanceButton";
    button.type = "button";
    button.textContent = "📥 Importar dados antigos";

    button.style.padding = "12px 18px";
    button.style.margin = "12px";
    button.style.borderRadius = "10px";
    button.style.cursor = "pointer";
    button.style.border = "1px solid #aaa";

    button.addEventListener(
        "click",
        importLegacyFinanceData
    );

    const main = document.querySelector("#appScreen main");

    if (main) {
        main.prepend(button);
    } else {
        document.getElementById("appScreen")?.prepend(button);
    }
}

createLegacyImportButton();
