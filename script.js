/* =========================================
   MEUMÊS
   Controle financeiro pessoal
========================================= */


/*
    O sistema começa em Outubro de 2026.

    Outubro é o mês-base e não pode ser
    excluído.

    Novembro em diante são criados
    manualmente pelo botão "+ Novo mês".
*/


const STORAGE_KEY =
    "meuMesDataV3";

const THEME_KEY =
    "meuMesTheme";

const INITIAL_MONTH =
    "2026-10";


let financialData =
    loadData();

let currentMonthKey =
    INITIAL_MONTH;



/* =========================================
   ELEMENTOS
========================================= */

const currentMonthElement =
    document.getElementById(
        "currentMonth"
    );

const previousMonthButton =
    document.getElementById(
        "previousMonth"
    );

const nextMonthButton =
    document.getElementById(
        "nextMonth"
    );

const addMonthButton =
    document.getElementById(
        "addMonthButton"
    );

const deleteMonthButton =
    document.getElementById(
        "deleteMonthButton"
    );


const totalIncomeElement =
    document.getElementById(
        "totalIncome"
    );

const totalExpensesElement =
    document.getElementById(
        "totalExpenses"
    );

const balanceElement =
    document.getElementById(
        "balance"
    );


const detailIncome =
    document.getElementById(
        "detailIncome"
    );

const detailPaid =
    document.getElementById(
        "detailPaid"
    );

const detailPending =
    document.getElementById(
        "detailPending"
    );

const detailAvailable =
    document.getElementById(
        "detailAvailable"
    );


const spentPercentageElement =
    document.getElementById(
        "spentPercentage"
    );

const spentProgress =
    document.getElementById(
        "spentProgress"
    );


const incomeList =
    document.getElementById(
        "incomeList"
    );

const expenseList =
    document.getElementById(
        "expenseList"
    );

const insightsElement =
    document.getElementById(
        "insights"
    );

const historyList =
    document.getElementById(
        "historyList"
    );


/* EVOLUÇÃO */

const toggleEvolutionButton =
    document.getElementById(
        "toggleEvolutionButton"
    );

const evolutionContent =
    document.getElementById(
        "evolutionContent"
    );

const evolutionButtonText =
    document.getElementById(
        "evolutionButtonText"
    );

const evolutionArrow =
    document.getElementById(
        "evolutionArrow"
    );


/* MODAL */

const modal =
    document.getElementById(
        "modal"
    );

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const closeModalButton =
    document.getElementById(
        "closeModal"
    );

const transactionForm =
    document.getElementById(
        "transactionForm"
    );

const transactionTypeInput =
    document.getElementById(
        "transactionType"
    );

const editIdInput =
    document.getElementById(
        "editId"
    );

const descriptionInput =
    document.getElementById(
        "description"
    );

const valueInput =
    document.getElementById(
        "value"
    );

const dateInput =
    document.getElementById(
        "date"
    );

const statusInput =
    document.getElementById(
        "status"
    );

const statusGroup =
    document.getElementById(
        "statusGroup"
    );

const addIncomeButton =
    document.getElementById(
        "addIncomeButton"
    );

const addExpenseButton =
    document.getElementById(
        "addExpenseButton"
    );


/* TEMA */

const themeButton =
    document.getElementById(
        "themeButton"
    );



/* =========================================
   CARREGAR DADOS
========================================= */

function loadData() {

    const saved =
        localStorage.getItem(
            STORAGE_KEY
        );


    if (saved) {

        try {

            const parsed =
                JSON.parse(saved);


            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
            ) {

                return parsed;

            }

        }

        catch (error) {

            console.error(
                "Erro ao carregar os dados:",
                error
            );

        }

    }


    /*
        Primeira utilização:

        somente Outubro/2026
        e absolutamente tudo zerado.
    */

    return {

        [INITIAL_MONTH]: {

            incomes: [],

            expenses: []

        }

    };

}



/* =========================================
   SALVAR
========================================= */

function saveData() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(
            financialData
        )

    );

}



/* =========================================
   GARANTIR OUTUBRO
========================================= */

function ensureInitialMonth() {

    if (
        !financialData[
            INITIAL_MONTH
        ]
    ) {

        financialData[
            INITIAL_MONTH
        ] = {

            incomes: [],

            expenses: []

        };

    }


    saveData();

}



/* =========================================
   GERAR ID
========================================= */

function generateId() {

    return (

        Date.now().toString()

        +

        Math.random()
            .toString(16)
            .slice(2)

    );

}



/* =========================================
   CHAVE → DATA
========================================= */

function keyToDate(key) {

    const [
        year,
        month
    ] =
        key.split("-");


    return new Date(

        Number(year),

        Number(month) - 1,

        1

    );

}



/* =========================================
   DATA → CHAVE
========================================= */

function dateToKey(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}`;

}



/* =========================================
   DINHEIRO
========================================= */

function formatMoney(value) {

    return Number(value)
        .toLocaleString(

            "pt-BR",

            {

                style:
                    "currency",

                currency:
                    "BRL"

            }

        );

}



/* =========================================
   NOME DO MÊS
========================================= */

function getMonthName(key) {

    return keyToDate(key)
        .toLocaleDateString(

            "pt-BR",

            {

                month:
                    "long",

                year:
                    "numeric"

            }

        );

}



/* =========================================
   DATA
========================================= */

function formatDate(dateString) {

    if (!dateString) {

        return "";

    }


    const [
        year,
        month,
        day
    ] =
        dateString.split("-");


    return `${day}/${month}/${year}`;

}



/* =========================================
   DATA PADRÃO
========================================= */

function getDefaultDate() {

    const [
        year,
        month
    ] =
        currentMonthKey.split("-");


    /*
        Caso o usuário esteja no mês
        correspondente à data real,
        usa o dia atual.
    */

    const today =
        new Date();


    if (
        Number(year) ===
            today.getFullYear()

        &&

        Number(month) ===
            today.getMonth() + 1
    ) {

        const day =
            String(
                today.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;

    }


    /*
        Para outros meses,
        começa no dia 01.
    */

    return `${year}-${month}-01`;

}



/* =========================================
   DADOS DO MÊS
========================================= */

function getCurrentMonthData() {

    return financialData[
        currentMonthKey
    ];

}



/* =========================================
   MESES CRIADOS
========================================= */

function getCreatedMonths() {

    return Object
        .keys(financialData)

        .filter(
            key =>
                key >=
                INITIAL_MONTH
        )

        .sort();

}



/* =========================================
   CÁLCULOS
========================================= */

function calculateMonth(data) {

    const incomes =
        Array.isArray(
            data.incomes
        )
            ? data.incomes
            : [];


    const expenses =
        Array.isArray(
            data.expenses
        )
            ? data.expenses
            : [];


    const totalIncome =
        incomes.reduce(

            (total, item) =>
                total +
                Number(item.value),

            0

        );


    const totalExpenses =
        expenses.reduce(

            (total, item) =>
                total +
                Number(item.value),

            0

        );


    const paidExpenses =
        expenses

            .filter(
                item =>
                    item.status ===
                    "paid"
            )

            .reduce(

                (total, item) =>
                    total +
                    Number(item.value),

                0

            );


    const pendingExpenses =
        expenses

            .filter(
                item =>
                    item.status ===
                    "pending"
            )

            .reduce(

                (total, item) =>
                    total +
                    Number(item.value),

                0

            );


    const balance =
        totalIncome -
        totalExpenses;


    const spentPercentage =

        totalIncome > 0

            ?

            (
                totalExpenses /
                totalIncome
            )
            *
            100

            :

            0;


    return {

        totalIncome,

        totalExpenses,

        paidExpenses,

        pendingExpenses,

        balance,

        spentPercentage

    };

}



/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {

    const data =
        getCurrentMonthData();


    if (!data) {

        currentMonthKey =
            INITIAL_MONTH;

        return updateDashboard();

    }


    const totals =
        calculateMonth(
            data
        );


    /* MÊS */

    currentMonthElement.textContent =
        getMonthName(
            currentMonthKey
        );


    /* CARDS */

    totalIncomeElement.textContent =
        formatMoney(
            totals.totalIncome
        );


    totalExpensesElement.textContent =
        formatMoney(
            totals.totalExpenses
        );


    balanceElement.textContent =
        formatMoney(
            totals.balance
        );


    /* DETALHES */

    detailIncome.textContent =
        formatMoney(
            totals.totalIncome
        );


    detailPaid.textContent =
        formatMoney(
            totals.paidExpenses
        );


    detailPending.textContent =
        formatMoney(
            totals.pendingExpenses
        );


    detailAvailable.textContent =
        formatMoney(
            totals.balance
        );


    /* PORCENTAGEM */

    const percentage =
        Math.round(
            totals.spentPercentage
        );


    spentPercentageElement.textContent =
        `${percentage}%`;


    spentProgress.style.width =
        `${
            Math.min(
                Math.max(
                    percentage,
                    0
                ),
                100
            )
        }%`;


    updateProgressColor(
        percentage
    );


    /* CONTEÚDO */

    renderIncomes(
        data.incomes || []
    );


    renderExpenses(
        data.expenses || []
    );


    renderInsights(
        data,
        totals
    );


    renderHistory();


    updateNavigation();

}



/* =========================================
   COR DA BARRA
========================================= */

function updateProgressColor(
    percentage
) {

    if (
        percentage < 60
    ) {

        spentProgress
            .style
            .background =
            "var(--income)";

    }

    else if (
        percentage < 85
    ) {

        spentProgress
            .style
            .background =
            "var(--warning)";

    }

    else {

        spentProgress
            .style
            .background =
            "var(--expense)";

    }

}



/* =========================================
   NAVEGAÇÃO
========================================= */

function updateNavigation() {

    const months =
        getCreatedMonths();


    const index =
        months.indexOf(
            currentMonthKey
        );


    /*
        Se estiver em Outubro,
        não existe mês anterior.
    */

    previousMonthButton.disabled =
        index <= 0;


    /*
        Só pode avançar se outro mês
        já tiver sido criado.
    */

    nextMonthButton.disabled =
        index ===
        months.length - 1;


    /*
        Outubro nunca pode ser apagado.
    */

    if (
        currentMonthKey ===
        INITIAL_MONTH
    ) {

        deleteMonthButton
            .classList
            .add(
                "hidden"
            );

    }

    else {

        deleteMonthButton
            .classList
            .remove(
                "hidden"
            );

    }

}



/* =========================================
   MÊS ANTERIOR
========================================= */

previousMonthButton
    .addEventListener(

        "click",

        function() {

            const months =
                getCreatedMonths();


            const index =
                months.indexOf(
                    currentMonthKey
                );


            if (
                index > 0
            ) {

                currentMonthKey =
                    months[
                        index - 1
                    ];


                updateDashboard();

            }

        }

    );



/* =========================================
   PRÓXIMO MÊS
========================================= */

nextMonthButton
    .addEventListener(

        "click",

        function() {

            const months =
                getCreatedMonths();


            const index =
                months.indexOf(
                    currentMonthKey
                );


            if (
                index >= 0

                &&

                index <
                months.length - 1
            ) {

                currentMonthKey =
                    months[
                        index + 1
                    ];


                updateDashboard();

            }

        }

    );



/* =========================================
   CRIAR NOVO MÊS
========================================= */

addMonthButton
    .addEventListener(

        "click",

        function() {

            const months =
                getCreatedMonths();


            const lastMonth =
                months[
                    months.length - 1
                ];


            const lastDate =
                keyToDate(
                    lastMonth
                );


            const nextDate =
                new Date(

                    lastDate.getFullYear(),

                    lastDate.getMonth() + 1,

                    1

                );


            const nextKey =
                dateToKey(
                    nextDate
                );


            /*
                Proteção para não criar
                duplicado.
            */

            if (
                financialData[
                    nextKey
                ]
            ) {

                currentMonthKey =
                    nextKey;


                updateDashboard();


                return;

            }


            /*
                Novo mês começa
                completamente zerado.
            */

            financialData[
                nextKey
            ] = {

                incomes: [],

                expenses: []

            };


            saveData();


            /*
                Abre automaticamente
                o mês criado.
            */

            currentMonthKey =
                nextKey;


            updateDashboard();

        }

    );



/* =========================================
   EXCLUIR MÊS
========================================= */

deleteMonthButton
    .addEventListener(

        "click",

        function() {

            /*
                Segurança extra:
                Outubro nunca é excluído.
            */

            if (
                currentMonthKey ===
                INITIAL_MONTH
            ) {

                return;

            }


            const monthName =
                getMonthName(
                    currentMonthKey
                );


            const confirmed =
                confirm(

                    `Excluir ${monthName}?\n\nTodas as entradas e gastos desse mês serão apagados.`

                );


            if (!confirmed) {

                return;

            }


            /*
                Guardamos a lista
                antes de apagar.
            */

            const months =
                getCreatedMonths();


            const currentIndex =
                months.indexOf(
                    currentMonthKey
                );


            /*
                Exclui o mês inteiro.
            */

            delete financialData[
                currentMonthKey
            ];


            saveData();


            const remainingMonths =
                getCreatedMonths();


            /*
                Depois de apagar,
                tentamos mostrar o mês
                imediatamente anterior.
            */

            const newIndex =
                Math.max(
                    0,
                    currentIndex - 1
                );


            currentMonthKey =
                remainingMonths[
                    Math.min(
                        newIndex,
                        remainingMonths.length - 1
                    )
                ]
                ||
                INITIAL_MONTH;


            updateDashboard();

        }

    );



/* =========================================
   RENDERIZAR ENTRADAS
========================================= */

function renderIncomes(
    incomes
) {

    incomeList.innerHTML =
        "";


    if (
        incomes.length === 0
    ) {

        incomeList.innerHTML = `

            <div class="empty">

                Nenhuma entrada registrada
                neste mês.

            </div>

        `;


        return;

    }


    const ordered =
        [...incomes]
            .sort(

                (a, b) =>
                    new Date(b.date)
                    -
                    new Date(a.date)

            );


    ordered.forEach(

        income => {

            const element =
                document
                    .createElement(
                        "div"
                    );


            element.className =
                "transaction";


            element.innerHTML = `

                <div
                    class="transaction-main"
                >

                    <div
                        class="transaction-icon"
                    >
                        💰
                    </div>


                    <div>

                        <h3>

                            ${escapeHTML(
                                income.description
                            )}

                        </h3>


                        <p>

                            ${formatDate(
                                income.date
                            )}

                        </p>

                    </div>

                </div>



                <div
                    class="transaction-value"
                >

                    <strong
                        style="
                            color:
                            var(--income)
                        "
                    >

                        + ${formatMoney(
                            income.value
                        )}

                    </strong>


                    <div
                        class="transaction-actions"
                    >

                        <button
                            class="action-button"
                            type="button"

                            onclick="
                                editTransaction(
                                    'income',
                                    '${income.id}'
                                )
                            "
                        >
                            Editar
                        </button>


                        <button
                            class="action-button"
                            type="button"

                            onclick="
                                deleteTransaction(
                                    'income',
                                    '${income.id}'
                                )
                            "
                        >
                            Excluir
                        </button>

                    </div>

                </div>

            `;


            incomeList
                .appendChild(
                    element
                );

        }

    );

}



/* =========================================
   RENDERIZAR GASTOS
========================================= */

function renderExpenses(
    expenses
) {

    expenseList.innerHTML =
        "";


    if (
        expenses.length === 0
    ) {

        expenseList.innerHTML = `

            <div class="empty">

                Nenhum gasto registrado
                neste mês.

            </div>

        `;


        return;

    }


    const ordered =
        [...expenses]
            .sort(

                (a, b) =>
                    new Date(b.date)
                    -
                    new Date(a.date)

            );


    ordered.forEach(

        expense => {

            const element =
                document
                    .createElement(
                        "div"
                    );


            element.className =
                "transaction";


            const isPaid =
                expense.status ===
                "paid";


            element.innerHTML = `

                <div
                    class="transaction-main"
                >

                    <div
                        class="transaction-icon"
                    >
                        💸
                    </div>


                    <div>

                        <h3>

                            ${escapeHTML(
                                expense.description
                            )}

                        </h3>


                        <p>

                            ${formatDate(
                                expense.date
                            )}

                        </p>


                        <span
                            class="
                                status

                                ${
                                    isPaid
                                        ?
                                        "status-paid"
                                        :
                                        "status-pending"
                                }
                            "
                        >

                            ${
                                isPaid
                                    ?
                                    "Pago"
                                    :
                                    "Pendente"
                            }

                        </span>

                    </div>

                </div>



                <div
                    class="transaction-value"
                >

                    <strong
                        style="
                            color:
                            var(--expense)
                        "
                    >

                        - ${formatMoney(
                            expense.value
                        )}

                    </strong>


                    <div
                        class="transaction-actions"
                    >

                        <button
                            class="action-button"
                            type="button"

                            onclick="
                                editTransaction(
                                    'expense',
                                    '${expense.id}'
                                )
                            "
                        >
                            Editar
                        </button>


                        <button
                            class="action-button"
                            type="button"

                            onclick="
                                deleteTransaction(
                                    'expense',
                                    '${expense.id}'
                                )
                            "
                        >
                            Excluir
                        </button>

                    </div>

                </div>

            `;


            expenseList
                .appendChild(
                    element
                );

        }

    );

}



/* =========================================
   INSIGHTS
========================================= */

function renderInsights(
    data,
    totals
) {

    insightsElement.innerHTML =
        "";


    const insights =
        [];


    /*
        MÊS ZERADO
    */

    if (
        totals.totalIncome === 0

        &&

        totals.totalExpenses === 0
    ) {

        insights.push(

            {

                title:
                    "👋 Comece seu mês",

                text:
                    "Adicione suas entradas e seus gastos para começar a acompanhar sua vida financeira."

            },

            {

                title:
                    "💰 Primeiro passo",

                text:
                    "Comece registrando o dinheiro que você recebeu ou espera receber neste mês."

            },

            {

                title:
                    "📊 Análise automática",

                text:
                    "Conforme você adicionar informações, os insights financeiros aparecerão aqui."

            }

        );


        showInsights(
            insights
        );


        return;

    }



    /*
        SEM RENDA, MAS COM GASTOS
    */

    if (
        totals.totalIncome === 0

        &&

        totals.totalExpenses > 0
    ) {

        insights.push({

            title:
                "💰 Cadastre suas entradas",

            text:
                `Você registrou ${formatMoney(totals.totalExpenses)} em gastos, mas ainda não informou nenhuma entrada.`

        });

    }



    /*
        PORCENTAGEM GASTA
    */

    if (
        totals.totalIncome > 0
    ) {

        if (
            totals.spentPercentage < 50
        ) {

            insights.push({

                title:
                    "🟢 Bom controle",

                text:
                    `Você utilizou ${totals.spentPercentage.toFixed(1)}% da sua renda neste mês.`

            });

        }


        else if (
            totals.spentPercentage < 80
        ) {

            insights.push({

                title:
                    "🟡 Fique de olho",

                text:
                    `Você já utilizou ${totals.spentPercentage.toFixed(1)}% da sua renda neste mês.`

            });

        }


        else if (
            totals.spentPercentage <= 100
        ) {

            insights.push({

                title:
                    "🟠 Atenção aos gastos",

                text:
                    `Você já comprometeu ${totals.spentPercentage.toFixed(1)}% da sua renda neste mês.`

            });

        }


        else {

            insights.push({

                title:
                    "🔴 Gastos acima da renda",

                text:
                    `Seus gastos ultrapassaram suas entradas em ${formatMoney(Math.abs(totals.balance))}.`

            });

        }

    }



    /*
        SALDO
    */

    if (
        totals.totalIncome > 0

        &&

        totals.balance >= 0
    ) {

        const availablePercentage =
            (
                totals.balance /
                totals.totalIncome
            )
            *
            100;


        insights.push({

            title:
                "💵 Saldo disponível",

            text:
                `Você ainda possui ${formatMoney(totals.balance)}, equivalente a ${availablePercentage.toFixed(1)}% do que recebeu.`

        });

    }



    /*
        PENDÊNCIAS
    */

    if (
        totals.pendingExpenses > 0
    ) {

        insights.push({

            title:
                "⏳ Ainda falta pagar",

            text:
                `Você possui ${formatMoney(totals.pendingExpenses)} em gastos marcados como pendentes.`

        });

    }



    /*
        MAIOR GASTO
    */

    if (
        data.expenses &&
        data.expenses.length > 0
    ) {

        const biggest =
            [...data.expenses]
                .sort(

                    (a, b) =>
                        Number(b.value)
                        -
                        Number(a.value)

                )[0];


        const percentage =

            totals.totalIncome > 0

                ?

                (
                    Number(biggest.value)
                    /
                    totals.totalIncome
                )
                *
                100

                :

                0;


        if (
            totals.totalIncome > 0
        ) {

            insights.push({

                title:
                    "📌 Maior gasto",

                text:
                    `${biggest.description} foi seu maior gasto: ${formatMoney(biggest.value)}, equivalente a ${percentage.toFixed(1)}% da sua renda.`

            });

        }

        else {

            insights.push({

                title:
                    "📌 Maior gasto",

                text:
                    `${biggest.description} foi seu maior gasto até agora: ${formatMoney(biggest.value)}.`

            });

        }

    }



    /*
        COMPARAÇÃO COM O MÊS ANTERIOR
    */

    const previousMonth =
        getPreviousCreatedMonth();


    if (previousMonth) {

        const previousTotals =
            calculateMonth(

                financialData[
                    previousMonth
                ]

            );


        /*
            Só compara se o mês anterior
            realmente possuir gastos.
        */

        if (
            previousTotals.totalExpenses > 0
        ) {

            const difference =
                totals.totalExpenses
                -
                previousTotals.totalExpenses;


            if (
                difference < 0
            ) {

                insights.push({

                    title:
                        "📉 Você gastou menos",

                    text:
                        `Seus gastos diminuíram ${formatMoney(Math.abs(difference))} em relação a ${getMonthName(previousMonth)}.`

                });

            }


            else if (
                difference > 0
            ) {

                insights.push({

                    title:
                        "📈 Você gastou mais",

                    text:
                        `Seus gastos aumentaram ${formatMoney(difference)} em relação a ${getMonthName(previousMonth)}.`

                });

            }


            else {

                insights.push({

                    title:
                        "➡️ Gastos estáveis",

                    text:
                        `Você gastou o mesmo valor registrado em ${getMonthName(previousMonth)}.`

                });

            }

        }

    }


    showInsights(
        insights
    );

}



/* =========================================
   MOSTRAR INSIGHTS
========================================= */

function showInsights(
    insights
) {

    insights.forEach(

        insight => {

            const element =
                document
                    .createElement(
                        "div"
                    );


            element.className =
                "insight";


            const title =
                document
                    .createElement(
                        "strong"
                    );


            title.textContent =
                insight.title;


            const text =
                document
                    .createElement(
                        "p"
                    );


            text.textContent =
                insight.text;


            element.appendChild(
                title
            );


            element.appendChild(
                text
            );


            insightsElement
                .appendChild(
                    element
                );

        }

    );

}



/* =========================================
   MÊS ANTERIOR CRIADO
========================================= */

function getPreviousCreatedMonth() {

    const months =
        getCreatedMonths();


    const index =
        months.indexOf(
            currentMonthKey
        );


    if (
        index <= 0
    ) {

        return null;

    }


    return months[
        index - 1
    ];

}



/* =========================================
   SUA EVOLUÇÃO
========================================= */

toggleEvolutionButton
    .addEventListener(

        "click",

        function() {

            const isHidden =
                evolutionContent
                    .classList
                    .contains(
                        "hidden"
                    );


            if (
                isHidden
            ) {

                evolutionContent
                    .classList
                    .remove(
                        "hidden"
                    );


                evolutionButtonText
                    .textContent =
                    "Esconder";


                evolutionArrow
                    .classList
                    .add(
                        "open"
                    );

            }

            else {

                evolutionContent
                    .classList
                    .add(
                        "hidden"
                    );


                evolutionButtonText
                    .textContent =
                    "Mostrar";


                evolutionArrow
                    .classList
                    .remove(
                        "open"
                    );

            }

        }

    );



/* =========================================
   HISTÓRICO
========================================= */

function renderHistory() {

    historyList.innerHTML =
        "";


    const months =
        [...getCreatedMonths()]
            .reverse();


    months.forEach(

        key => {

            const data =
                financialData[
                    key
                ];


            const totals =
                calculateMonth(
                    data
                );


            const card =
                document
                    .createElement(
                        "div"
                    );


            card.className =
                "history-card";


            if (
                key ===
                currentMonthKey
            ) {

                card.classList.add(
                    "active"
                );

            }


            card.innerHTML = `

                <h3>

                    ${getMonthName(
                        key
                    )}

                </h3>


                <p>
                    Entradas
                </p>

                <strong>

                    ${formatMoney(
                        totals.totalIncome
                    )}

                </strong>


                <p>
                    Gastos
                </p>

                <strong>

                    ${formatMoney(
                        totals.totalExpenses
                    )}

                </strong>


                <p>
                    Saldo
                </p>

                <strong>

                    ${formatMoney(
                        totals.balance
                    )}

                </strong>

            `;


            card.addEventListener(

                "click",

                function() {

                    currentMonthKey =
                        key;


                    updateDashboard();


                    window.scrollTo({

                        top: 0,

                        behavior:
                            "smooth"

                    });

                }

            );


            historyList
                .appendChild(
                    card
                );

        }

    );

}



/* =========================================
   ABRIR MODAL
========================================= */

function openModal(
    type
) {

    transactionForm.reset();


    editIdInput.value =
        "";


    transactionTypeInput.value =
        type;


    dateInput.value =
        getDefaultDate();


    if (
        type === "income"
    ) {

        modalTitle.textContent =
            "Nova entrada";


        statusGroup
            .style
            .display =
            "none";

    }

    else {

        modalTitle.textContent =
            "Novo gasto";


        statusGroup
            .style
            .display =
            "block";

    }


    modal.classList
        .remove(
            "hidden"
        );


    document.body.style.overflow =
        "hidden";


    setTimeout(

        function() {

            descriptionInput
                .focus();

        },

        100

    );

}



/* =========================================
   FECHAR MODAL
========================================= */

function closeModal() {

    modal.classList
        .add(
            "hidden"
        );


    document.body.style.overflow =
        "";

}



/* =========================================
   SALVAR REGISTRO
========================================= */

transactionForm
    .addEventListener(

        "submit",

        function(event) {

            event.preventDefault();


            const type =
                transactionTypeInput
                    .value;


            const editId =
                editIdInput
                    .value;


            const description =
                descriptionInput
                    .value
                    .trim();


            const value =
                Number(
                    valueInput.value
                );


            const date =
                dateInput.value;


            /*
                Validação básica.
            */

            if (
                !description

                ||

                !Number.isFinite(value)

                ||

                value <= 0

                ||

                !date
            ) {

                alert(
                    "Preencha os campos corretamente."
                );


                return;

            }


            /*
                Impede cadastrar uma data
                pertencente a outro mês.
            */

            if (
                date.slice(0, 7)
                !==
                currentMonthKey
            ) {

                alert(

                    `A data precisa pertencer a ${getMonthName(currentMonthKey)}.`

                );


                return;

            }


            const data =
                getCurrentMonthData();



            /* ENTRADA */

            if (
                type ===
                "income"
            ) {

                const income = {

                    id:
                        editId
                        ||
                        generateId(),

                    description,

                    value,

                    date

                };


                if (
                    editId
                ) {

                    const index =
                        data.incomes
                            .findIndex(

                                item =>
                                    item.id
                                    ===
                                    editId

                            );


                    if (
                        index !== -1
                    ) {

                        data.incomes[
                            index
                        ] =
                            income;

                    }

                }

                else {

                    data.incomes
                        .push(
                            income
                        );

                }

            }



            /* GASTO */

            else {

                const expense = {

                    id:
                        editId
                        ||
                        generateId(),

                    description,

                    value,

                    date,

                    status:
                        statusInput.value

                };


                if (
                    editId
                ) {

                    const index =
                        data.expenses
                            .findIndex(

                                item =>
                                    item.id
                                    ===
                                    editId

                            );


                    if (
                        index !== -1
                    ) {

                        data.expenses[
                            index
                        ] =
                            expense;

                    }

                }

                else {

                    data.expenses
                        .push(
                            expense
                        );

                }

            }


            saveData();


            closeModal();


            updateDashboard();

        }

    );



/* =========================================
   EDITAR
========================================= */

function editTransaction(
    type,
    id
) {

    const data =
        getCurrentMonthData();


    const list =

        type === "income"

            ?

            data.incomes

            :

            data.expenses;


    const item =
        list.find(

            transaction =>
                transaction.id
                ===
                id

        );


    if (!item) {

        return;

    }


    openModal(
        type
    );


    editIdInput.value =
        item.id;


    descriptionInput.value =
        item.description;


    valueInput.value =
        item.value;


    dateInput.value =
        item.date;


    if (
        type ===
        "expense"
    ) {

        statusInput.value =
            item.status;


        modalTitle.textContent =
            "Editar gasto";

    }

    else {

        modalTitle.textContent =
            "Editar entrada";

    }

}



/* =========================================
   EXCLUIR TRANSAÇÃO
========================================= */

function deleteTransaction(
    type,
    id
) {

    const confirmed =
        confirm(
            "Deseja realmente excluir este registro?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    const data =
        getCurrentMonthData();


    if (
        type ===
        "income"
    ) {

        data.incomes =
            data.incomes
                .filter(

                    item =>
                        item.id
                        !==
                        id

                );

    }

    else {

        data.expenses =
            data.expenses
                .filter(

                    item =>
                        item.id
                        !==
                        id

                );

    }


    saveData();


    updateDashboard();

}



/* =========================================
   BOTÕES DE TRANSAÇÃO
========================================= */

addIncomeButton
    .addEventListener(

        "click",

        function() {

            openModal(
                "income"
            );

        }

    );


addExpenseButton
    .addEventListener(

        "click",

        function() {

            openModal(
                "expense"
            );

        }

    );


closeModalButton
    .addEventListener(

        "click",

        closeModal

    );


document
    .querySelector(
        ".modal-overlay"
    )
    .addEventListener(

        "click",

        closeModal

    );


document
    .addEventListener(

        "keydown",

        function(event) {

            if (
                event.key ===
                "Escape"

                &&

                !modal
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {

                closeModal();

            }

        }

    );



/* =========================================
   TEMA
========================================= */

function loadTheme() {

    const theme =
        localStorage.getItem(
            THEME_KEY
        );


    if (
        theme ===
        "dark"
    ) {

        document.body
            .classList
            .add(
                "dark"
            );


        themeButton.textContent =
            "☀️";

    }

    else {

        themeButton.textContent =
            "🌙";

    }

}



themeButton
    .addEventListener(

        "click",

        function() {

            document.body
                .classList
                .toggle(
                    "dark"
                );


            const isDark =
                document.body
                    .classList
                    .contains(
                        "dark"
                    );


            localStorage.setItem(

                THEME_KEY,

                isDark
                    ?
                    "dark"
                    :
                    "light"

            );


            themeButton.textContent =

                isDark
                    ?
                    "☀️"
                    :
                    "🌙";

        }

    );



/* =========================================
   PROTEÇÃO DE TEXTO
========================================= */

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text);


    return div.innerHTML;

}



/* =========================================
   INICIAR
========================================= */

function init() {

    ensureInitialMonth();


    /*
        Sempre inicia mostrando
        Outubro/2026.
    */

    currentMonthKey =
        INITIAL_MONTH;


    loadTheme();


    /*
        Evolução começa escondida.
    */

    evolutionContent
        .classList
        .add(
            "hidden"
        );


    evolutionButtonText
        .textContent =
        "Mostrar";


    updateDashboard();

}


init();