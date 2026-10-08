
/*
 * DINHEIRO DO MÊS
 * Importação segura dos dados antigos do navegador.
 *
 * Não altera nem apaga meuMesDataV3.
 * Não exclui registros existentes no Supabase.
 */

(() => {
    const LEGACY_KEY = "meuMesDataV3";
    const MIN_MONTH = "2026-10";

    let legacyData = null;
    let importInProgress = false;
    let backupCreated = false;

    function showImportMessage(message) {
        const element = document.getElementById("legacyImportMessage");
        if (element) element.textContent = message;
    }

    function readLegacyData() {
        const raw = localStorage.getItem(LEGACY_KEY);

        if (!raw) {
            throw new Error(
                "Não encontramos dados antigos neste navegador."
            );
        }

        let parsed;

        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error(
                "Os dados antigos não estão em um formato válido."
            );
        }

        if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) {
            throw new Error("Formato de dados antigos inválido.");
        }

        return parsed;
    }

    function getLegacySummary(data) {
        let months = 0;
        let incomes = 0;
        let expenses = 0;

        for (const [monthKey, month] of Object.entries(data)) {
            if (
                !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ||
                monthKey < MIN_MONTH ||
                !month ||
                typeof month !== "object"
            ) {
                continue;
            }

            months++;
            incomes += Array.isArray(month.incomes)
                ? month.incomes.length
                : 0;
            expenses += Array.isArray(month.expenses)
                ? month.expenses.length
                : 0;
        }

        return { months, incomes, expenses };
    }

    async function makeStableUUID(text) {
        const bytes = new TextEncoder().encode(text);
        const hash = new Uint8Array(
            await crypto.subtle.digest("SHA-256", bytes)
        );

        const id = hash.slice(0, 16);

        // UUID determinístico, versão 5-like.
        id[6] = (id[6] & 0x0f) | 0x50;
        id[8] = (id[8] & 0x3f) | 0x80;

        const hex = [...id]
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");

        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32)
        ].join("-");
    }

    function validateTransaction(item, monthKey, type) {
        if (!item || typeof item !== "object") {
            throw new Error("Registro antigo inválido.");
        }

        const value = Number(item.value);

        if (
            typeof item.description !== "string" ||
            !item.description.trim() ||
            !Number.isFinite(value) ||
            value <= 0 ||
            typeof item.date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
            item.date.slice(0, 7) !== monthKey
        ) {
            throw new Error(
                `Existe um ${type} inválido em ${monthKey}. ` +
                "Nenhum registro será importado até corrigirmos isso."
            );
        }

        if (
            type === "expenses" &&
            !["paid", "pending"].includes(item.status)
        ) {
            throw new Error(
                `Existe um gasto com status inválido em ${monthKey}.`
            );
        }
    }

    async function buildImportRows(data, userId) {
        const months = [];
        const incomes = [];
        const expenses = [];

        for (const [monthKey, month] of Object.entries(data)) {
            if (
                !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ||
                monthKey < MIN_MONTH
            ) {
                continue;
            }

            months.push({
                user_id: userId,
                month_key: monthKey
            });

            for (const type of ["incomes", "expenses"]) {
                const items = Array.isArray(month?.[type])
                    ? month[type]
                    : [];

                for (let index = 0; index < items.length; index++) {
                    const item = items[index];

                    validateTransaction(item, monthKey, type);

                    const stableId = await makeStableUUID(
                        JSON.stringify([
                            "meuMesLegacyImportV1",
                            userId,
                            monthKey,
                            type,
                            String(item.id ?? index)
                        ])
                    );

                    const row = {
                        id: stableId,
                        user_id: userId,
                        month_key: monthKey,
                        description: item.description.trim(),
                        value: Number(item.value),
                        transaction_date: item.date
                    };

                    if (type === "expenses") {
                        row.status = item.status;
                    }

                    if (type === "incomes") {
                        incomes.push(row);
                    } else {
                        expenses.push(row);
                    }
                }
            }
        }

        return { months, incomes, expenses };
    }

    async function requireSuccess(query) {
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async function insertMissingRows(table, rows, userId) {
        const existingRows = await fetchAllFinanceRows(table);
        const existingIds = new Set(
            existingRows.map(row => row.id)
        );

        const missing = rows.filter(
            row => !existingIds.has(row.id)
        );

        for (const row of missing) {
            // Não modifica registros já existentes.
            await requireSuccess(
                supabaseClient
                    .from(table)
                    .upsert(row, {
                        onConflict: "id",
                        ignoreDuplicates: true
                    })
            );
        }

        return missing.length;
    }

    function downloadLegacyBackup() {
        try {
            const raw = localStorage.getItem(LEGACY_KEY);

            if (!raw) {
                throw new Error("Nenhum dado antigo encontrado.");
            }

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

            setTimeout(() => URL.revokeObjectURL(url), 60000);

            backupCreated = true;

            showImportMessage(
                "Download solicitado. Confira se o arquivo JSON " +
                "foi salvo no celular antes de importar."
            );
        } catch (error) {
            showImportMessage(error.message);
        }
    }

    async function importLegacyData() {
        if (importInProgress) return;

        if (!window.financeReady || !window.financeUserId) {
            showImportMessage("Entre na sua conta primeiro.");
            return;
        }

        if (!legacyData) {
            showImportMessage("Primeiro procure os dados antigos.");
            return;
        }

        if (!backupCreated) {
            showImportMessage(
                "Faça e confira o backup antes de importar."
            );
            return;
        }

        const summary = getLegacySummary(legacyData);

        const confirmed = confirm(
            "Importar os dados antigos para sua conta?\n\n" +
            `Meses: ${summary.months}\n` +
            `Ganhos: ${summary.incomes}\n` +
            `Gastos: ${summary.expenses}\n\n` +
            "Os registros existentes não serão apagados."
        );

        if (!confirmed) return;

        importInProgress = true;

        const button = document.getElementById("legacyImportConfirm");
        button.disabled = true;

        try {
            const { data: authData, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError || !authData.user) {
                throw new Error("Sua sessão expirou. Entre novamente.");
            }

            if (authData.user.id !== window.financeUserId) {
                throw new Error("A conta mudou durante a importação.");
            }

            showImportMessage("Validando os registros antigos...");

            const rows = await buildImportRows(
                legacyData,
                authData.user.id
            );

            if (rows.months.length === 0) {
                throw new Error("Nenhum mês válido encontrado.");
            }

            // Meses: cria apenas os que ainda não existem.
            for (const month of rows.months) {
                await requireSuccess(
                    supabaseClient
                        .from("months")
                        .upsert(month, {
                            onConflict: "user_id,month_key",
                            ignoreDuplicates: true
                        })
                );
            }

            showImportMessage("Importando ganhos...");

            const addedIncomes = await insertMissingRows(
                "incomes",
                rows.incomes,
                authData.user.id
            );

            showImportMessage("Importando gastos...");

            const addedExpenses = await insertMissingRows(
                "expenses",
                rows.expenses,
                authData.user.id
            );

            showImportMessage(
                `Importação concluída! ` +
                `${addedIncomes} ganhos e ` +
                `${addedExpenses} gastos adicionados.`
            );

            alert(
                "Importação concluída!\n\n" +
                "A página será atualizada para carregar " +
                "os registros do Supabase."
            );

            window.location.reload();

        } catch (error) {
            console.error("Erro na importação:", error);

            showImportMessage(
                "Erro: " + error.message +
                " Os dados originais continuam no navegador. " +
                "Alguns registros podem ter sido enviados; " +
                "não cadastre cópias manualmente."
            );

            button.disabled = false;
        } finally {
            importInProgress = false;
        }
    }

    function findLegacyData() {
        try {
            legacyData = readLegacyData();
            backupCreated = false;

            const summary = getLegacySummary(legacyData);

            showImportMessage(
                `Encontrados: ${summary.months} meses, ` +
                `${summary.incomes} ganhos e ` +
                `${summary.expenses} gastos.`
            );

            document.getElementById(
                "legacyBackupButton"
            ).disabled = false;

            document.getElementById(
                "legacyImportConfirm"
            ).disabled = summary.months === 0;

        } catch (error) {
            legacyData = null;
            showImportMessage(error.message);
        }
    }

    function createImportPanel() {
        const panel = document.createElement("section");

        panel.id = "legacyImportPanel";
        panel.style.padding = "16px";
        panel.style.margin = "16px auto";
        panel.style.maxWidth = "800px";
        panel.style.border = "1px solid #999";
        panel.style.borderRadius = "12px";

        panel.innerHTML = `
            <h2>📦 Recuperar dados antigos</h2>
            <p>
                Recupere os ganhos e gastos salvos neste navegador
                antes da integração com o Supabase.
            </p>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" id="legacyFindButton">
                    1. Procurar dados
                </button>

                <button type="button"
                        id="legacyBackupButton" disabled>
                    2. Fazer backup
                </button>

                <button type="button"
                        id="legacyImportConfirm" disabled>
                    3. Importar dados
                </button>
            </div>

            <p id="legacyImportMessage"
               role="status"
               style="margin-top:12px;">
                Nenhuma busca realizada.
            </p>
        `;

        const main = document.querySelector("#appScreen main");

        if (!main) {
            console.error(
                "Não foi possível localizar o dashboard."
            );
            return;
        }

        main.prepend(panel);

        document.getElementById("legacyFindButton")
            .addEventListener("click", findLegacyData);

        document.getElementById("legacyBackupButton")
            .addEventListener("click", downloadLegacyBackup);

        document.getElementById("legacyImportConfirm")
            .addEventListener("click", importLegacyData);
    }

    createImportPanel();
})();
