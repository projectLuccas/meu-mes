
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

