/* =========================================================
   FINTECH DASHBOARD — COMPLETE V1 LOGIC
   ========================================================= */

const STORAGE_KEY = "fintechDashboardStateV2";

const DEFAULT_STATE = {
    setupComplete: false,

    startingBalance: 0,
    startingSavings: 0,
    savingsContributions: 0,

    incomeFrequency: "Monthly",

    transactions: [],
    budgets: [],
    goals: [],

    profile: {
        name: "",
        email: "",
        type: "Personal Account"
    },

    settings: {
        currency: "USD",
        dark: false,
        notifications: true
    }
};

let state = loadState();
let spendingChart = null;
let categoryChart = null;
let cashFlowChart = null;
let currentPage = "dashboard";

const PAGE_META = {
    dashboard: ["Financial overview", "Dashboard"],
    transactions: ["Money movement", "Transactions"],
    analytics: ["Insights", "Analytics"],
    budgets: ["Planning", "Budgets"],
    savings: ["Goals", "Savings"],
    settings: ["Preferences", "Settings"]
};

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
    setupNavigation();
    setupSidebar();
    setupPopovers();
    setupGlobalModalClose();
    setupTransactionModal();
    setupTransactionFilters();
    setupBudgetModal();
    setupGoalModal();
    setupContributionModal();
    setupSettings();
    setupDashboardControls();
    setupFinancialSetup();

    applySettings();
    setTodayAsDefaultDate();
    renderEverything();

    if (!state.setupComplete) {
        setTimeout(() => {
            openModal("setupModal");
        }, 80);
    }

    updateCurrentDate();

    setInterval(updateCurrentDate, 1000);
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(DEFAULT_STATE);
        }

        const parsed = JSON.parse(saved);

        /*
         * The previous version contained demonstration data.
         * If the saved data is from that version, start the user
         * with a completely clean financial account instead.
         */
        if (
            parsed.setupComplete !== true &&
            !parsed.startingBalance &&
            !parsed.startingSavings
        ) {
            return structuredClone(DEFAULT_STATE);
        }

        return {
            ...structuredClone(DEFAULT_STATE),
            ...parsed,

            setupComplete: Boolean(parsed.setupComplete),

            startingBalance:
                Number(parsed.startingBalance) || 0,

            startingSavings:
                Number(parsed.startingSavings) || 0,

            savingsContributions:
                Number(parsed.savingsContributions) || 0,

            transactions:
                Array.isArray(parsed.transactions)
                    ? parsed.transactions
                    : [],

            budgets:
                Array.isArray(parsed.budgets)
                    ? parsed.budgets
                    : [],

            goals:
                Array.isArray(parsed.goals)
                    ? parsed.goals
                    : [],

            profile: {
                ...DEFAULT_STATE.profile,
                ...(parsed.profile || {})
            },

            settings: {
                ...DEFAULT_STATE.settings,
                ...(parsed.settings || {})
            }
        };

    } catch (error) {
        console.error(
            "Could not load saved dashboard data:",
            error
        );

        return structuredClone(DEFAULT_STATE);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getElement(id) {
    return document.getElementById(id);
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            navigateTo(item.dataset.page);
        });
    });

    document.querySelectorAll("[data-go-page]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.goPage);
            closeAllPopovers();
        });
    });

    getElement("brandButton")?.addEventListener("click", () => navigateTo("dashboard"));
}

function navigateTo(page) {
    if (!PAGE_META[page]) page = "dashboard";
    currentPage = page;

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
    });

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.toggle("active", section.dataset.pageSection === page);
    });

    const meta = PAGE_META[page];
    getElement("pageEyebrow").textContent = meta[0];
    getElement("pageTitle").textContent = meta[1];

    closeSidebar();

    if (page === "analytics") renderAnalytics();
    if (page === "budgets") renderBudgets();
    if (page === "savings") renderSavings();
}

function setupSidebar() {
    const sidebar = getElement("sidebar");
    const overlay = getElement("sidebarOverlay");

    getElement("menuButton")?.addEventListener("click", () => {
        sidebar.classList.add("open");
        overlay.classList.add("visible");
    });

    getElement("sidebarClose")?.addEventListener("click", closeSidebar);
    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
            closeAllPopovers();
        }
    });
}

function closeSidebar() {
    getElement("sidebar")?.classList.remove("open");
    getElement("sidebarOverlay")?.classList.remove("visible");
}

function setupPopovers() {
    const notificationButton = getElement("notificationButton");
    const notificationPopover = getElement("notificationPopover");
    const profilePopover = getElement("profilePopover");

    notificationButton?.addEventListener("click", event => {
        event.stopPropagation();
        profilePopover.classList.remove("open");
        notificationPopover.classList.toggle("open");
        notificationPopover.setAttribute("aria-hidden", String(!notificationPopover.classList.contains("open")));
    });

    getElement("topbarUserButton")?.addEventListener("click", event => {
        event.stopPropagation();
        notificationPopover.classList.remove("open");
        profilePopover.classList.toggle("open");
        profilePopover.setAttribute("aria-hidden", String(!profilePopover.classList.contains("open")));
    });

    getElement("userMenuButton")?.addEventListener("click", event => {
        event.stopPropagation();
        notificationPopover.classList.remove("open");
        profilePopover.classList.toggle("open");
        profilePopover.setAttribute("aria-hidden", String(!profilePopover.classList.contains("open")));
    });

    document.addEventListener("click", event => {
        if (!notificationPopover.contains(event.target) && event.target !== notificationButton) {
            notificationPopover.classList.remove("open");
        }

        if (
            !profilePopover.contains(event.target) &&
            !getElement("topbarUserButton").contains(event.target) &&
            event.target !== getElement("userMenuButton")
        ) {
            profilePopover.classList.remove("open");
        }
    });

    getElement("clearNotifications")?.addEventListener("click", () => {
        localStorage.setItem("fintechDismissedNotifications", "1");
        renderNotifications();
        showToast("Notifications cleared.");
    });

    getElement("popoverExport")?.addEventListener("click", exportData);
}

function closeAllPopovers() {
    document.querySelectorAll(".notification-popover,.profile-popover").forEach(popover => {
        popover.classList.remove("open");
    });
}

function setupGlobalModalClose() {
    document.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", () => {
            closeModal(button.dataset.closeModal);
        });
    });

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal(modal.id);
        });
    });
}

function openModal(id) {
    const modal = getElement(id);
    if (!modal) return;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeModal(id) {
    const modal = getElement(id);
    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".modal.open")) {
        document.body.style.overflow = "";
    }
}

function setupFinancialSetup() {
    const form = getElement("setupForm");

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(form);

        const startingBalance =
            Number(data.get("startingBalance"));

        const startingSavings =
            Number(data.get("startingSavings"));

        const name =
            String(data.get("name") || "").trim();

        const email =
            String(data.get("email") || "").trim();

        const frequency =
            String(
                data.get("incomeFrequency") || "Monthly"
            );

        const currency =
            String(
                data.get("currency") || "USD"
            );

        if (
            !Number.isFinite(startingBalance) ||
            startingBalance < 0
        ) {
            showToast(
                "Enter a valid available balance.",
                "error"
            );

            return;
        }

        if (
            !Number.isFinite(startingSavings) ||
            startingSavings < 0
        ) {
            showToast(
                "Enter a valid current savings amount.",
                "error"
            );

            return;
        }

        if (!name) {
            showToast(
                "Enter your name to continue.",
                "error"
            );

            return;
        }

        state.setupComplete = true;

        state.startingBalance =
            startingBalance;

        state.startingSavings =
            startingSavings;

        state.savingsContributions = 0;

        state.incomeFrequency =
            frequency;

        state.profile.name =
            name;

        state.profile.email =
            email;

        state.settings.currency =
            currency;

        saveState();

        closeModal("setupModal");

        renderEverything();

        showToast(
            "Your real financial dashboard is ready.",
            "success"
        );
    });
}

function setupTransactionModal() {
    getElement("dashboardAddButton")?.addEventListener("click", () => openTransactionModal());
    getElement("transactionsAddButton")?.addEventListener("click", () => openTransactionModal());

    getElement("transactionForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const id = formData.get("id");
        const name = String(formData.get("name") || "").trim();
        const type = String(formData.get("type") || "expense");
        const amount = Number(formData.get("amount"));
        const category = String(formData.get("category") || "Other");
        const date = String(formData.get("date") || "");
        const description = String(formData.get("description") || "").trim();

        if (!name || !amount || amount <= 0 || !date) {
            showToast("Please complete the required transaction fields.", "error");
            return;
        }

        if (id) {
            const transaction = state.transactions.find(item => String(item.id) === String(id));

            if (transaction) {
                Object.assign(transaction, {
                    name,
                    type,
                    amount,
                    category,
                    date,
                    description,
                    status: transaction.status || "Completed"
                });

                showToast("Transaction updated.", "success");
            }
        } else {
            state.transactions.unshift({
                id: Date.now(),
                name,
                type,
                amount,
                category,
                date,
                status: "Completed",
                description: description || getDefaultDescription(category)
            });

            showToast("Transaction added.", "success");
        }

        saveState();

        event.currentTarget.reset();
        getElement("transactionId").value = "";
        getElement("transactionModalTitle").textContent = "Add transaction";
        getElement("transactionSubmit").textContent = "Add transaction";

        setTodayAsDefaultDate();
        closeModal("transactionModal");
        renderEverything();
    });
}

function openTransactionModal() {
    getElement("transactionForm")?.reset();
    getElement("transactionId").value = "";
    getElement("transactionModalTitle").textContent = "Add transaction";
    getElement("transactionSubmit").textContent = "Add transaction";
    setTodayAsDefaultDate();
    openModal("transactionModal");
}

function openTransactionEditor(id) {
    const transaction = state.transactions.find(item => String(item.id) === String(id));
    if (!transaction) return;

    getElement("transactionId").value = transaction.id;
    getElement("transactionName").value = transaction.name || "";
    getElement("transactionType").value = transaction.type || "expense";
    getElement("transactionAmount").value = transaction.amount || "";
    getElement("transactionCategory").value = transaction.category || "Other";
    getElement("transactionDate").value = transaction.date || "";
    getElement("transactionDescription").value = transaction.description || "";
    getElement("transactionModalTitle").textContent = "Edit transaction";
    getElement("transactionSubmit").textContent = "Save changes";

    openModal("transactionModal");
}

function deleteTransaction(id) {
    const transaction = state.transactions.find(item => String(item.id) === String(id));
    if (!transaction) return;

    if (!confirm(`Delete "${transaction.name}"?`)) return;

    state.transactions = state.transactions.filter(item => String(item.id) !== String(id));
    saveState();
    renderEverything();
    showToast("Transaction deleted.");
}

function setupTransactionFilters() {
    ["transactionSearch", "transactionTypeFilter", "transactionCategoryFilter", "transactionSort"].forEach(id => {
        getElement(id)?.addEventListener("input", renderAllTransactions);
        getElement(id)?.addEventListener("change", renderAllTransactions);
    });

    getElement("dashboardSearch")?.addEventListener("input", renderDashboardTransactions);
}

function getFilteredTransactions() {
    const search = String(getElement("transactionSearch")?.value || "").trim().toLowerCase();
    const type = getElement("transactionTypeFilter")?.value || "all";
    const category = getElement("transactionCategoryFilter")?.value || "all";
    const sort = getElement("transactionSort")?.value || "newest";

    let filtered = state.transactions.filter(transaction => {
        const haystack = [
            transaction.name,
            transaction.category,
            transaction.description,
            transaction.status
        ].join(" ").toLowerCase();

        return (!search || haystack.includes(search))
            && (type === "all" || transaction.type === type)
            && (category === "all" || transaction.category === category);
    });

    filtered.sort((a, b) => {
        if (sort === "oldest") return new Date(a.date) - new Date(b.date);
        if (sort === "high") return Number(b.amount) - Number(a.amount);
        if (sort === "low") return Number(a.amount) - Number(b.amount);
        return new Date(b.date) - new Date(a.date);
    });

    return filtered;
}

function populateCategoryFilter() {
    const select = getElement("transactionCategoryFilter");
    if (!select) return;

    const current = select.value || "all";
    const categories = [...new Set(
        state.transactions.map(item => item.category).filter(Boolean)
    )].sort();

    select.innerHTML = `<option value="all">All categories</option>`;

    categories.forEach(category => {
        select.insertAdjacentHTML(
            "beforeend",
            `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
        );
    });

    select.value = categories.includes(current) ? current : "all";
}

function renderAllTransactions() {
    populateCategoryFilter();

    const list = getElement("allTransactionList");
    if (!list) return;

    const filtered = getFilteredTransactions();

    if (!filtered.length) {
        list.innerHTML = `<tr><td colspan="6" class="empty-state">No transactions match your filters.</td></tr>`;
        return;
    }

    list.innerHTML = filtered
        .map(transaction => transactionRow(transaction, true))
        .join("");
}

function renderDashboardTransactions() {
    const list = getElement("dashboardTransactionList");
    if (!list) return;

    const search = String(
        getElement("dashboardSearch")?.value || ""
    ).trim().toLowerCase();

    const filtered = state.transactions
        .filter(transaction => {
            const haystack =
                `${transaction.name} ${transaction.category} ${transaction.description || ""}`
                .toLowerCase();

            return !search || haystack.includes(search);
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (!filtered.length) {
        list.innerHTML = `<tr><td colspan="5" class="empty-state">No matching transactions.</td></tr>`;
        return;
    }

    list.innerHTML = filtered
        .map(transaction => transactionRow(transaction, false))
        .join("");
}

function transactionRow(transaction, actions) {
    const amount = Number(transaction.amount) || 0;
    const isIncome = transaction.type === "income";
    const status = transaction.status || "Completed";
    const statusClass = status.toLowerCase();
    const initial = String(transaction.name || "?").charAt(0).toUpperCase();

    return `
        <tr>
            <td>
                <div class="transaction-name">
                    <div class="transaction-icon ${isIncome ? "income" : ""}">${escapeHTML(initial)}</div>
                    <div>
                        <strong>${escapeHTML(transaction.name)}</strong>
                        <span>${escapeHTML(transaction.description || getDefaultDescription(transaction.category))}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(transaction.category || "Other")}</td>
            <td>${formatDate(transaction.date)}</td>
            <td><span class="status ${escapeHTML(statusClass)}">${escapeHTML(status)}</span></td>
            <td class="amount ${isIncome ? "income" : "expense"}">
                ${isIncome ? "+" : "-"}${formatCurrency(amount)}
            </td>
            ${actions ? `
                <td>
                    <div class="row-actions">
                        <button class="icon-action" type="button" data-edit-transaction="${transaction.id}" aria-label="Edit transaction">✎</button>
                        <button class="icon-action delete" type="button" data-delete-transaction="${transaction.id}" aria-label="Delete transaction">×</button>
                    </div>
                </td>
            ` : ""}
        </tr>
    `;
}

document.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-transaction]");
    const remove = event.target.closest("[data-delete-transaction]");

    if (edit) openTransactionEditor(edit.dataset.editTransaction);
    if (remove) deleteTransaction(remove.dataset.deleteTransaction);

    const editBudget = event.target.closest("[data-edit-budget]");
    const deleteBudgetButton = event.target.closest("[data-delete-budget]");

    if (editBudget) openBudgetEditor(editBudget.dataset.editBudget);
    if (deleteBudgetButton) deleteBudget(deleteBudgetButton.dataset.deleteBudget);

    const editGoal = event.target.closest("[data-edit-goal]");
    const deleteGoalButton = event.target.closest("[data-delete-goal]");
    const contribute = event.target.closest("[data-contribute-goal]");

    if (editGoal) openGoalEditor(editGoal.dataset.editGoal);
    if (deleteGoalButton) deleteGoal(deleteGoalButton.dataset.deleteGoal);
    if (contribute) openContributionModal(contribute.dataset.contributeGoal);
});

function setupDashboardControls() {
    getElement("chartPeriod")?.addEventListener("change", renderSpendingChart);
}

function getStartingCash() {
    return Number(state.startingBalance) || 0;
}

function getStartingSavings() {
    return Number(state.startingSavings) || 0;
}

function getTotalIncome() {
    return state.transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

function getTotalExpenses() {
    return state.transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

function getSavingsContributions() {
    return state.goals.reduce(
        (sum, goal) => sum + Math.max(Number(goal.current) || 0, 0),
        0
    );
}

function getCashBalance() {
    return getStartingCash()
        + getTotalIncome()
        - getTotalExpenses()
        - getSavingsContributions();
}

function getSavingsBalance() {
    return getStartingSavings() + getSavingsContributions();
}

function updateFinancialSummary() {

    const income =
        state.transactions
            .filter(t => t.type === "income")
            .reduce(
                (sum, t) =>
                    sum + Number(t.amount || 0),
                0
            );

    const expenses =
        state.transactions
            .filter(t => t.type === "expense")
            .reduce(
                (sum, t) =>
                    sum + Number(t.amount || 0),
                0
            );

    /*
     * Available balance and savings are separate buckets.
     *
     * Available balance:
     * starting balance
     * + income
     * - expenses
     * - money moved into savings
     *
     * Savings:
     * starting savings
     * + savings contributions
     */

    const availableBalance =
        Number(state.startingBalance || 0)
        + income
        - expenses
        - Number(
            state.savingsContributions || 0
        );

    const savings =
        Number(state.startingSavings || 0)
        + Number(
            state.savingsContributions || 0
        );

    const savingsRate =
        income > 0
            ? Math.max(
                0,
                ((income - expenses) / income) * 100
            )
            : 0;

    getElement("totalIncome").textContent =
        formatCurrency(income);

    getElement("totalExpenses").textContent =
        formatCurrency(expenses);

    getElement("totalBalance").textContent =
        formatCurrency(availableBalance);

    getElement("totalSavings").textContent =
        formatCurrency(savings);

    getElement("savingsRate").textContent =
        `${savingsRate.toFixed(1)}%`;

    getElement("balanceTrend").textContent =
        availableBalance >= 0
            ? "Healthy"
            : "Negative";

    getElement("balanceTrend").className =
        `trend ${
            availableBalance >= 0
                ? "positive"
                : "negative"
        }`;
}

function renderDashboardBudgets() {
    const container = getElement("dashboardBudgets");
    if (!container) return;

    if (!state.budgets.length) {
        container.innerHTML =
            `<div class="empty-state">No budgets yet. Create one from the Budgets page.</div>`;
        return;
    }

    container.innerHTML = state.budgets.slice(0, 4).map(budget => {
        const spent = categorySpent(budget.category);
        const percent = budget.amount > 0
            ? Math.min((spent / budget.amount) * 100, 100)
            : 0;

        const className =
            percent >= 100
                ? "danger"
                : percent >= 80
                    ? "warning"
                    : "";

        return `
            <div class="budget-item">
                <div class="budget-info">
                    <div>
                        <strong>${escapeHTML(budget.category)}</strong>
                        <span>${formatCurrency(spent)} of ${formatCurrency(budget.amount)}</span>
                    </div>
                    <strong>${Math.round(percent)}%</strong>
                </div>

                <div class="progress-bar ${className}">
                    <span style="width:${percent}%"></span>
                </div>
            </div>
        `;
    }).join("");
}

function categorySpent(category) {
    return state.transactions
        .filter(t => t.type === "expense" && t.category === category)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

function renderSpendingChart() {
    const canvas = getElement("spendingChart");
    const empty = getElement("chartEmpty");

    if (!canvas || typeof Chart === "undefined") return;

    const days = Number(getElement("chartPeriod")?.value || 30);

    const cutoff = new Date();
    cutoff.setHours(23, 59, 59, 999);
    cutoff.setDate(cutoff.getDate() - days);

    const byCategory = {};

    state.transactions
        .filter(t => t.type === "expense")
        .filter(t => {
            const date = parseLocalDate(t.date)
            return date >= cutoff && date <= new Date();
        })
        .forEach(t => {
            byCategory[t.category] =
                (byCategory[t.category] || 0) + Number(t.amount || 0);
        });

    const labels = Object.keys(byCategory);
    const data = Object.values(byCategory);

    if (spendingChart) spendingChart.destroy();

    empty.classList.toggle("hidden", labels.length > 0);
    canvas.classList.toggle("hidden", labels.length === 0);

    if (!labels.length) return;

    spendingChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        padding: 18,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            ` ${context.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });
}

function renderAnalytics() {
    const expenses = state.transactions.filter(t => t.type === "expense");
    const income = state.transactions.filter(t => t.type === "income");

    const totalExpense = expenses.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
    );

    const totalIncome = income.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
    );

    const average = expenses.length
        ? totalExpense / expenses.length
        : 0;

    const largest = expenses.length
        ? Math.max(...expenses.map(t => Number(t.amount || 0)))
        : 0;

    const rate = totalIncome
        ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100)
        : 0;

    getElement("averageExpense").textContent = formatCurrency(average);
    getElement("largestExpense").textContent = formatCurrency(largest);
    getElement("analyticsSavingsRate").textContent = `${rate.toFixed(1)}%`;
    getElement("transactionCount").textContent = state.transactions.length;

    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] =
            (categoryTotals[t.category] || 0) + Number(t.amount || 0);
    });

    renderCategoryChart(categoryTotals);
    renderCashFlowChart();
}

function renderCategoryChart(categoryTotals) {
    const canvas = getElement("categoryChart");
    const empty = getElement("categoryEmpty");

    if (!canvas || typeof Chart === "undefined") return;

    if (categoryChart) categoryChart.destroy();

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    empty.classList.toggle("hidden", labels.length > 0);
    canvas.classList.toggle("hidden", labels.length === 0);

    if (!labels.length) return;

    categoryChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Spending",
                data,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => ` ${formatCurrency(c.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value, true)
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderCashFlowChart() {
    const canvas = getElement("cashFlowChart");
    const empty = getElement("cashFlowEmpty");

    if (!canvas || typeof Chart === "undefined") return;

    if (cashFlowChart) cashFlowChart.destroy();

    if (!state.transactions.length) {
        canvas.classList.add("hidden");
        empty.classList.remove("hidden");
        return;
    }

    canvas.classList.remove("hidden");
    empty.classList.add("hidden");

    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

        months.push({
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            label: date.toLocaleDateString("en-US", { month: "short" }),
            income: 0,
            expense: 0
        });
    }

    state.transactions.forEach(t => {
        const date = parseLocalDate(t.date)

        const key =
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const month = months.find(m => m.key === key);

        if (!month) return;

        if (t.type === "income") {
            month.income += Number(t.amount || 0);
        } else {
            month.expense += Number(t.amount || 0);
        }
    });

    cashFlowChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: "Income",
                    data: months.map(m => m.income),
                    tension: .35,
                    borderWidth: 2
                },
                {
                    label: "Expenses",
                    data: months.map(m => m.expense),
                    tension: .35,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value, true)
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function setupBudgetModal() {
    getElement("addBudgetButton")?.addEventListener("click", () => {
        resetBudgetForm();
        openModal("budgetModal");
    });

    getElement("budgetForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(event.currentTarget);
        const id = data.get("id");
        const category = String(data.get("category"));
        const amount = Number(data.get("amount"));

        if (!amount || amount <= 0) {
            showToast("Enter a valid budget amount.", "error");
            return;
        }

        const duplicate = state.budgets.find(
            b => b.category === category &&
            String(b.id) !== String(id)
        );

        if (duplicate) {
            showToast(
                `${category} already has a budget. Edit the existing one instead.`,
                "error"
            );
            return;
        }

        if (id) {
            const budget = state.budgets.find(
                b => String(b.id) === String(id)
            );

            if (budget) {
                Object.assign(budget, {
                    category,
                    amount
                });
            }

            showToast("Budget updated.", "success");
        } else {
            state.budgets.push({
                id: Date.now(),
                category,
                amount
            });

            showToast("Budget created.", "success");
        }

        saveState();
        closeModal("budgetModal");
        renderEverything();
    });
}

function resetBudgetForm() {
    getElement("budgetForm").reset();
    getElement("budgetId").value = "";
    getElement("budgetModalTitle").textContent = "New budget";
}

function openBudgetEditor(id) {
    const budget = state.budgets.find(
        b => String(b.id) === String(id)
    );

    if (!budget) return;

    getElement("budgetId").value = budget.id;
    getElement("budgetCategory").value = budget.category;
    getElement("budgetAmount").value = budget.amount;
    getElement("budgetModalTitle").textContent = "Edit budget";

    openModal("budgetModal");
}

function deleteBudget(id) {
    const budget = state.budgets.find(
        b => String(b.id) === String(id)
    );

    if (!budget) return;

    if (!confirm(`Delete the ${budget.category} budget?`)) return;

    state.budgets = state.budgets.filter(
        b => String(b.id) !== String(id)
    );

    saveState();
    renderEverything();
    showToast("Budget deleted.");
}

function renderBudgets() {
    const cards = getElement("budgetCards");
    if (!cards) return;

    const totalBudgeted = state.budgets.reduce(
        (sum, b) => sum + Number(b.amount || 0),
        0
    );

    const totalSpent = state.budgets.reduce(
        (sum, b) => sum + categorySpent(b.category),
        0
    );

    const remaining = totalBudgeted - totalSpent;

    const atRisk = state.budgets.filter(b => {
        const pct = b.amount
            ? categorySpent(b.category) / b.amount
            : 0;

        return pct >= .8;
    }).length;

    getElement("totalBudgeted").textContent = formatCurrency(totalBudgeted);
    getElement("totalBudgetSpent").textContent = formatCurrency(totalSpent);
    getElement("budgetRemaining").textContent = formatCurrency(remaining);
    getElement("budgetsAtRisk").textContent = atRisk;

    if (!state.budgets.length) {
        cards.innerHTML =
            `<article class="feature-card"><p>No budgets yet. Create your first budget to start tracking spending.</p></article>`;
        return;
    }

    cards.innerHTML = state.budgets.map(budget => {
        const spent = categorySpent(budget.category);
        const remaining = budget.amount - spent;

        const percentRaw = budget.amount
            ? (spent / budget.amount) * 100
            : 0;

        const percent = Math.min(percentRaw, 100);

        const progressClass =
            percentRaw >= 100
                ? "danger"
                : percentRaw >= 80
                    ? "warning"
                    : "";

        return `
            <article class="feature-card">
                <div class="feature-card-head">
                    <div>
                        <p class="panel-label">Monthly budget</p>
                        <h3>${escapeHTML(budget.category)}</h3>
                        <p>
                            ${
                                percentRaw >= 100
                                    ? "Over budget"
                                    : percentRaw >= 80
                                        ? "Close to your limit"
                                        : "On track"
                            }
                        </p>
                    </div>

                    <strong>${formatCurrency(budget.amount)}</strong>
                </div>

                <div class="goal-progress">
                    <div class="progress-bar ${progressClass}">
                        <span style="width:${percent}%"></span>
                    </div>

                    <div class="goal-progress-label">
                        <span>${formatCurrency(spent)} spent</span>
                        <span>${Math.round(percentRaw)}%</span>
                    </div>
                </div>

                <div class="feature-meta">
                    <div>
                        <span>Remaining</span>
                        <strong>${formatCurrency(remaining)}</strong>
                    </div>

                    <div>
                        <span>Spent</span>
                        <strong>${formatCurrency(spent)}</strong>
                    </div>

                    <div>
                        <span>Limit</span>
                        <strong>${formatCurrency(budget.amount)}</strong>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="secondary-button" data-edit-budget="${budget.id}" type="button">Edit</button>
                    <button class="danger-button" data-delete-budget="${budget.id}" type="button">Delete</button>
                </div>
            </article>
        `;
    }).join("");
}

function setupGoalModal() {
    getElement("addGoalButton")?.addEventListener("click", () => {
        resetGoalForm();
        openModal("goalModal");
    });

    getElement("goalForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(event.currentTarget);

        const id = data.get("id");
        const name = String(data.get("name") || "").trim();
        const target = Number(data.get("target"));
        const current = Number(data.get("current") || 0);
        const deadline = String(data.get("deadline") || "");

        if (!name || !target || target <= 0 || current < 0) {
            showToast("Please enter valid goal details.", "error");
            return;
        }

        if (current > target) {
            showToast(
                "Already saved cannot be greater than the target.",
                "error"
            );
            return;
        }

        if (id) {
            const goal = state.goals.find(
                g => String(g.id) === String(id)
            );

            if (goal) {
                Object.assign(goal, {
                    name,
                    target,
                    current,
                    deadline
                });
            }

            showToast("Savings goal updated.", "success");
        } else {
            state.goals.push({
                id: Date.now(),
                name,
                target,
                current,
                deadline
            });

            showToast("Savings goal created.", "success");
        }

        saveState();
        closeModal("goalModal");
        renderEverything();
    });
}

function resetGoalForm() {
    getElement("goalForm").reset();
    getElement("goalId").value = "";
    getElement("goalCurrent").value = "0";
    getElement("goalModalTitle").textContent = "New savings goal";
}

function openGoalEditor(id) {
    const goal = state.goals.find(
        g => String(g.id) === String(id)
    );

    if (!goal) return;

    getElement("goalId").value = goal.id;
    getElement("goalName").value = goal.name;
    getElement("goalTarget").value = goal.target;
    getElement("goalCurrent").value = goal.current;
    getElement("goalDeadline").value = goal.deadline || "";
    getElement("goalModalTitle").textContent = "Edit savings goal";

    openModal("goalModal");
}

function deleteGoal(id) {
    const goal = state.goals.find(
        g => String(g.id) === String(id)
    );

    if (!goal) return;

    if (!confirm(`Delete "${goal.name}"?`)) return;

    state.goals = state.goals.filter(
        g => String(g.id) !== String(id)
    );

    saveState();
    renderEverything();
    showToast("Savings goal deleted.");
}

function openContributionModal(id) {
    const goal = state.goals.find(
        g => String(g.id) === String(id)
    );

    if (!goal) return;

    getElement("contributeGoalId").value = goal.id;
    getElement("contributeAmount").value = "";

    openModal("contributeModal");
}

function setupContributionModal() {

    getElement("contributeForm")?.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const id =
                getElement("contributeGoalId").value;

            const amount =
                Number(
                    getElement("contributeAmount").value
                );

            const goal =
                state.goals.find(
                    g =>
                        String(g.id) ===
                        String(id)
                );

            if (
                !goal ||
                !amount ||
                amount <= 0
            ) {
                showToast(
                    "Enter a valid amount.",
                    "error"
                );

                return;
            }

            const income =
                state.transactions
                    .filter(
                        t =>
                            t.type === "income"
                    )
                    .reduce(
                        (sum, t) =>
                            sum +
                            Number(t.amount || 0),
                        0
                    );

            const expenses =
                state.transactions
                    .filter(
                        t =>
                            t.type === "expense"
                    )
                    .reduce(
                        (sum, t) =>
                            sum +
                            Number(t.amount || 0),
                        0
                    );

            const availableBalance =
                Number(
                    state.startingBalance || 0
                )
                + income
                - expenses
                - Number(
                    state.savingsContributions || 0
                );

            if (amount > availableBalance) {

                showToast(
                    "You cannot save more than your available balance.",
                    "error"
                );

                return;
            }

            const room =
                Math.max(
                    Number(goal.target) -
                    Number(goal.current),
                    0
                );

            const actualAmount =
                Math.min(amount, room);

            if (actualAmount <= 0) {

                showToast(
                    "This savings goal has already reached its target.",
                    "error"
                );

                return;
            }

            goal.current =
                Number(goal.current) +
                actualAmount;

            state.savingsContributions =
                Number(
                    state.savingsContributions || 0
                ) + actualAmount;

            saveState();

            closeModal("contributeModal");

            renderEverything();

            if (
                goal.current >=
                goal.target
            ) {

                showToast(
                    `${goal.name} reached its target! 🎉`,
                    "success"
                );

            } else {

                showToast(
                    `${formatCurrency(actualAmount)} added to ${goal.name}.`,
                    "success"
                );
            }
        }
    );
}

function renderSavings() {
    const cards = getElement("savingsCards");
    if (!cards) return;

    if (!state.goals.length) {
        cards.innerHTML =
            `<article class="feature-card"><p>No savings goals yet. Create one to give your money a purpose.</p></article>`;
        return;
    }

    cards.innerHTML = state.goals.map(goal => {
        const percentRaw = goal.target
            ? (goal.current / goal.target) * 100
            : 0;

        const percent = Math.min(percentRaw, 100);
        const deadlineText = goal.deadline
            ? formatDate(goal.deadline)
            : "No deadline";

        const daysLeft = goal.deadline
            ? daysUntil(goal.deadline)
            : null;

        return `
            <article class="feature-card">
                <div class="feature-card-head">
                    <div>
                        <p class="panel-label">Savings goal</p>
                        <h3>${escapeHTML(goal.name)}</h3>
                        <p>
                            ${
                                goal.deadline
                                    ? `${daysLeft < 0 ? "Past deadline" : `${daysLeft} days left`}`
                                    : "Flexible target"
                            }
                        </p>
                    </div>

                    <strong>${Math.round(percent)}%</strong>
                </div>

                <div class="goal-progress">
                    <div class="progress-bar">
                        <span style="width:${percent}%"></span>
                    </div>

                    <div class="goal-progress-label">
                        <span>${formatCurrency(goal.current)} saved</span>
                        <span>${formatCurrency(goal.target)} target</span>
                    </div>
                </div>

                <div class="feature-meta">
                    <div>
                        <span>Remaining</span>
                        <strong>${formatCurrency(Math.max(goal.target - goal.current, 0))}</strong>
                    </div>

                    <div>
                        <span>Target date</span>
                        <strong>${deadlineText}</strong>
                    </div>

                    <div>
                        <span>Status</span>
                        <strong>${percent >= 100 ? "Complete" : "In progress"}</strong>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="primary-button" data-contribute-goal="${goal.id}" type="button">+ Add money</button>
                    <button class="secondary-button" data-edit-goal="${goal.id}" type="button">Edit</button>
                    <button class="danger-button" data-delete-goal="${goal.id}" type="button">Delete</button>
                </div>
            </article>
        `;
    }).join("");
}

function setupFinancialSetup() {
    getElement("financialSetupForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(event.currentTarget);

        const startingBalance = Number(
            data.get("startingBalance")
        );

        const startingSavings = Number(
            data.get("startingSavings")
        );

        const monthlyIncome = Number(
            data.get("monthlyIncome") || 0
        );

        const name = String(
            data.get("setupName") || ""
        ).trim();

        const email = String(
            data.get("setupEmail") || ""
        ).trim();

        const incomeFrequency = String(
            data.get("incomeFrequency") || "Monthly"
        );

        if (!Number.isFinite(startingBalance) || startingBalance < 0) {
            showToast(
                "Enter a valid current balance.",
                "error"
            );
            return;
        }

        if (!Number.isFinite(startingSavings) || startingSavings < 0) {
            showToast(
                "Enter a valid current savings amount.",
                "error"
            );
            return;
        }

        if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
            showToast(
                "Enter a valid monthly income amount.",
                "error"
            );
            return;
        }

        if (startingSavings > startingBalance) {
            showToast(
                "Current savings cannot be greater than your current balance.",
                "error"
            );
            return;
        }

        state.startingBalance =
            startingBalance - startingSavings;

        state.startingSavings = startingSavings;
        state.monthlyIncome = monthlyIncome;
        state.incomeFrequency = incomeFrequency;

        state.profile.name = name;
        state.profile.email = email;

        state.setupComplete = true;

        saveState();
        closeModal("financialSetupModal");
        renderEverything();

        showToast(
            "Your real financial starting point has been saved.",
            "success"
        );
    });
}

function setupSettings() {
    getElement("profileForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(event.currentTarget);

        state.profile.name =
            String(data.get("name") || "").trim();

        state.profile.type =
            String(data.get("type") || "Personal Account").trim()
            || "Personal Account";

        state.profile.email =
            String(data.get("email") || "").trim();

        saveState();
        renderProfile();
        renderNotifications();

        showToast("Profile saved.", "success");
    });

    getElement("currencySetting")?.addEventListener("change", event => {
        state.settings.currency = event.target.value;

        saveState();
        renderEverything();

        showToast("Currency updated.", "success");
    });

    getElement("themeToggle")?.addEventListener("change", event => {
        state.settings.dark = event.target.checked;

        saveState();
        applySettings();
    });

    getElement("notificationsToggle")?.addEventListener("change", event => {
        state.settings.notifications =
            event.target.checked;

        saveState();
        renderNotifications();

        showToast(
            event.target.checked
                ? "Notifications enabled."
                : "Notifications disabled."
        );
    });

    getElement("exportDataButton")?.addEventListener(
        "click",
        exportData
    );

    getElement("resetDataButton")?.addEventListener(
        "click",
        resetDashboard
    );
}

function applySettings() {
    document.body.classList.toggle(
        "dark",
        Boolean(state.settings.dark)
    );

    const currency = getElement("currencySetting");
    const theme = getElement("themeToggle");
    const notifications = getElement("notificationsToggle");

    if (currency) {
        currency.value = state.settings.currency;
    }

    if (theme) {
        theme.checked = Boolean(state.settings.dark);
    }

    if (notifications) {
        notifications.checked =
            Boolean(state.settings.notifications);
    }
}

function renderProfile() {
    const name = state.profile.name || "Your Name";

    const initials =
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase()
        || "YN";

    ["sidebarAvatar", "topbarAvatar", "popoverAvatar"].forEach(id => {
        const element = getElement(id);

        if (element) {
            element.textContent = initials;
        }
    });

    getElement("sidebarUserName").textContent = name;

    getElement("sidebarUserType").textContent =
        state.profile.type || "Personal Account";

    getElement("topbarUserName").textContent = name;

    getElement("welcomeName").textContent =
        name.split(/\s+/)[0] || "there";

    getElement("popoverName").textContent = name;

    getElement("popoverEmail").textContent =
        state.profile.email
        || state.profile.type
        || "Personal Account";

    getElement("profileName").value = name;
    getElement("profileType").value =
        state.profile.type || "";

    getElement("profileEmail").value =
        state.profile.email || "";
}

function buildNotifications() {
    const notifications = [];

    if (!state.settings.notifications) {
        return notifications;
    }

    state.budgets.forEach(budget => {
        const spent = categorySpent(budget.category);

        const percent = budget.amount
            ? (spent / budget.amount) * 100
            : 0;

        if (percent >= 100) {
            notifications.push({
                type: "warning",
                title: `${budget.category} budget exceeded`,
                text:
                    `You've spent ${formatCurrency(spent)} against a ` +
                    `${formatCurrency(budget.amount)} limit.`
            });
        } else if (percent >= 80) {
            notifications.push({
                type: "warning",
                title: `${budget.category} budget is nearly full`,
                text:
                    `${Math.round(percent)}% of this budget has been used.`
            });
        }
    });

    state.goals.forEach(goal => {
        if (goal.current >= goal.target) {
            notifications.push({
                type: "success",
                title: `${goal.name} is complete`,
                text:
                    `You reached your ${formatCurrency(goal.target)} savings target.`
            });
        } else if (
            goal.deadline &&
            daysUntil(goal.deadline) >= 0 &&
            daysUntil(goal.deadline) <= 14
        ) {
            notifications.push({
                type: "warning",
                title: `${goal.name} deadline is close`,
                text:
                    `${daysUntil(goal.deadline)} days remain to reach the goal.`
            });
        }
    });

    const pending = state.transactions.filter(
        t => String(t.status).toLowerCase() === "pending"
    ).length;

    if (pending) {
        notifications.push({
            type: "warning",
            title:
                `${pending} pending transaction${pending === 1 ? "" : "s"}`,
            text:
                "Review your transaction activity when convenient."
        });
    }

    if (!notifications.length) {
        notifications.push({
            type: "success",
            title: "You're all caught up",
            text: "No urgent financial alerts right now."
        });
    }

    return notifications;
}

function renderNotifications() {
    const list = getElement("notificationList");

    if (!list) return;

    const dismissed =
        localStorage.getItem(
            "fintechDismissedNotifications"
        ) === "1";

    const notifications =
        dismissed
            ? []
            : buildNotifications();

    getElement("notificationCount").textContent =
        notifications.length;

    getElement("notificationDot").classList.toggle(
        "hidden",
        notifications.length === 0
    );

    list.innerHTML = notifications.length
        ? notifications.map(item => `
            <div class="notification-item ${item.type}">
                <span class="notice-dot"></span>
                <div>
                    <strong>${escapeHTML(item.title)}</strong>
                    <span>${escapeHTML(item.text)}</span>
                </div>
            </div>
        `).join("")
        : `<div class="empty-state">No new notifications.</div>`;

    const top = buildNotifications()[0];

    if (top && !dismissed) {
        getElement("attentionTitle").textContent =
            top.title;

        getElement("attentionText").textContent =
            top.text;
    } else {
        getElement("attentionTitle").textContent =
            "You're all caught up";

        getElement("attentionText").textContent =
            "No urgent budget alerts.";
    }
}

function renderDashboardInsights() {
    const expenses =
        state.transactions.filter(
            t => t.type === "expense"
        );

    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] =
            (categoryTotals[t.category] || 0)
            + Number(t.amount || 0);
    });

    const sorted =
        Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);

    const top = sorted[0];

    getElement("topCategory").textContent =
        top ? top[0] : "No spending yet";

    getElement("topCategoryAmount").textContent =
        top
            ? formatCurrency(top[1])
            : formatCurrency(0);

    const income = getTotalIncome();
    const expense = getTotalExpenses();

    const score =
        calculateHealthScore(income, expense);

    getElement("healthScore").textContent =
        income || expense
            ? `${score}/100`
            : "No score yet";

    getElement("healthText").textContent =
        income || expense
            ? healthDescription(score)
            : "Add income and expenses to calculate it.";
}

function calculateHealthScore(income, expenses) {
    if (!income && !expenses) return 0;

    let score = 50;

    if (income > expenses) {
        score += 20;
    } else if (income < expenses) {
        score -= 20;
    }

    if (income > 0) {
        const savingsRate =
            (income - expenses) / income;

        if (savingsRate >= .3) {
            score += 25;
        } else if (savingsRate >= .2) {
            score += 18;
        } else if (savingsRate >= .1) {
            score += 10;
        } else if (savingsRate < 0) {
            score -= 20;
        }
    }

    const riskBudgets =
        state.budgets.filter(
            b =>
                b.amount &&
                categorySpent(b.category) / b.amount >= .8
        ).length;

    score -= Math.min(
        riskBudgets * 5,
        20
    );

    return Math.max(
        0,
        Math.min(100, Math.round(score))
    );
}

function healthDescription(score) {
    if (score >= 80) {
        return "Strong balance and spending position.";
    }

    if (score >= 60) {
        return "Generally healthy, with room to improve.";
    }

    if (score >= 40) {
        return "Watch spending and keep building your buffer.";
    }

    return "Your spending is putting pressure on your balance.";
}

function renderEverything() {
    renderProfile();
    updateCurrentDate();
    updateFinancialSummary();
    renderDashboardBudgets();
    renderDashboardTransactions();
    renderAllTransactions();
    renderAnalytics();
    renderBudgets();
    renderSavings();
    renderSpendingChart();
    renderDashboardInsights();
    renderNotifications();
    applySettings();
}

function setTodayAsDefaultDate() {
    const input = getElement("transactionDate");

    if (input && !input.value) {
        input.value = toInputDate(new Date());
    }
}

function updateCurrentDate() {

    const element =
        getElement("currentDate");

    if (!element) return;

    const now = new Date();

    element.textContent =
        new Intl.DateTimeFormat(
            undefined,
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        ).format(now);
}

function formatCurrency(amount, compact = false) {
    const currency =
        state.settings.currency || "USD";

    const options = {
        style: "currency",
        currency,
        minimumFractionDigits:
            compact ? 0 : 2,
        maximumFractionDigits:
            compact ? 0 : 2
    };

    return new Intl.NumberFormat(undefined, options)
    .format(Number(amount) || 0);
}

function parseLocalDate(dateString) {

    if (!dateString) return null;

    const [
        year,
        month,
        day
    ] =
        String(dateString)
            .split("-")
            .map(Number);

    if (!year || !month || !day) {
        return null;
    }

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

function formatDate(dateString) {

    const date =
        parseLocalDate(dateString);

    if (!date) return "—";

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    ).format(date);
}

function toInputDate(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function daysUntil(dateString) {
    const target =
        parseLocalDate(dateString)

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return Math.ceil(
        (target - today) / 86400000
    );
}

function getDefaultDescription(category) {
    const descriptions = {
        Food: "Food purchase",
        Transport: "Transportation",
        Entertainment: "Entertainment",
        Shopping: "Shopping purchase",
        Bills: "Bill payment",
        Housing: "Housing expense",
        Health: "Health expense",
        Education: "Education expense",
        Income: "Income",
        Other: "Financial transaction"
    };

    return descriptions[category]
        || descriptions.Other;
}

function escapeHTML(value) {
    const div =
        document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function exportData() {
    const payload = {
        exportedAt: new Date().toISOString(),
        ...state
    };

    const blob =
        new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: "application/json" }
        );

    const url =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href = url;

    anchor.download =
        `fintech-dashboard-backup-${toInputDate(new Date())}.json`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    showToast(
        "Your dashboard data was exported.",
        "success"
    );
}

function resetDashboard() {

    const confirmed =
        confirm(
            "This will remove your saved financial data and return the dashboard to first-time setup. Continue?"
        );

    if (!confirmed) return;

    state =
        structuredClone(
            DEFAULT_STATE
        );

    localStorage.removeItem(
        "fintechDismissedNotifications"
    );

    saveState();

    renderEverything();

    navigateTo("dashboard");

    openModal("setupModal");
}

function showToast(message, type = "success") {
    const container =
        getElement("toastContainer");

    if (!container) return;

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3200);
}
