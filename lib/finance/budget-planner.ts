export type BudgetLineItem = {
  id: string;
  categoryKey: string;
  categoryName: string;
  itemName: string;
  plannedAmount: number;
  actualAmount: number;
  notes?: string;
  isDefault?: boolean;
};

export type BudgetCategory = {
  key: string;
  name: string;
  items: BudgetLineItem[];
  isIncome?: boolean;
};

export type BudgetCategoryTotal = {
  categoryKey: string;
  categoryName: string;
  plannedTotal: number;
  actualTotal: number;
  difference: number;
  percentOfIncome: number;
  itemCount: number;
};

export type BudgetSummary = {
  totalPlannedIncome: number;
  totalActualIncome: number;
  totalPlannedExpenses: number;
  totalActualExpenses: number;
  plannedSurplus: number;
  actualSurplus: number;
  variance: number;
  savingsRate: number;
  expenseToIncomeRatio: number;
  fixedExpenseRatio: number;
  lifestyleSpendingRatio: number;
};

export type BudgetInput = {
  month: string;
  title: string;
  income: BudgetLineItem[];
  expenses: BudgetLineItem[];
  notes?: string;
};

export const DEFAULT_BUDGET_CATEGORIES: Array<{ key: string; name: string; items: string[]; isIncome?: boolean }> = [
  { key: "income", name: "Income", isIncome: true, items: ["Salary / wages", "Business income", "Rental income", "Investment income", "Other income"] },
  { key: "fixed-expenses", name: "Fixed Expenses", items: ["Rent / mortgage", "Electricity", "Water", "Gas", "Internet", "Phone", "Insurance", "Subscriptions"] },
  { key: "food", name: "Food", items: ["Groceries", "Restaurants", "Coffee", "Snacks", "Takeout"] },
  { key: "transportation", name: "Transportation", items: ["Fuel", "Maintenance", "Parking fees", "Insurance", "Public transport", "Taxi / rideshare"] },
  { key: "shopping", name: "Shopping", items: ["Clothes", "Electronics", "Beauty", "Home goods", "Gifts", "Household supplies"] },
  { key: "medical", name: "Medical", items: ["Doctor visits", "Medications", "Health insurance", "Dental", "Vision"] },
  { key: "fitness-wellness", name: "Fitness & Wellness", items: ["Gym membership", "Sports equipment", "Wellness products", "Supplements"] },
  { key: "entertainment-lifestyle", name: "Entertainment & Lifestyle", items: ["Movies", "Concerts / events", "Hobbies", "Restaurants", "Parties", "Leisure travel", "Streaming services"] },
  { key: "education-children", name: "Education / Children", items: ["Childcare", "Tuition fees", "Books", "Materials", "Courses", "School fees"] },
  { key: "savings-goals", name: "Savings & Goals", items: ["Emergency fund", "Retirement savings", "Investment contribution", "Down payment savings", "Debt payoff goal", "Other savings goal"] }
];

const lifestyleCategoryKeys = new Set(["food", "shopping", "fitness-wellness", "entertainment-lifestyle"]);

function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function percent(numerator: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  const value = (numerator / denominator) * 100;
  return Number.isFinite(value) ? value : 0;
}

function makeLineItem(categoryKey: string, categoryName: string, itemName: string, index: number, isDefault = true): BudgetLineItem {
  return {
    id: `${categoryKey}-${index + 1}`,
    categoryKey,
    categoryName,
    itemName,
    plannedAmount: 0,
    actualAmount: 0,
    notes: "",
    isDefault
  };
}

export function getDefaultBudgetTemplate(): { income: BudgetLineItem[]; expenses: BudgetLineItem[]; categories: BudgetCategory[] } {
  const categories = DEFAULT_BUDGET_CATEGORIES.map((category) => ({
    key: category.key,
    name: category.name,
    isIncome: category.isIncome,
    items: category.items.map((itemName, index) => makeLineItem(category.key, category.name, itemName, index))
  }));

  return {
    income: categories.find((category) => category.isIncome)?.items ?? [],
    expenses: categories.filter((category) => !category.isIncome).flatMap((category) => category.items),
    categories
  };
}

export function normalizeBudgetMonth(value: string) {
  const trimmed = String(value ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizeBudgetLineItem(value: unknown): BudgetLineItem | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const categoryKey = String(input.categoryKey ?? "").trim();
  const categoryName = String(input.categoryName ?? "").trim();
  const itemName = String(input.itemName ?? "").trim();
  if (!categoryKey || !categoryName || !itemName) return null;

  return {
    id: String(input.id ?? "").trim() || crypto.randomUUID(),
    categoryKey,
    categoryName,
    itemName: itemName.slice(0, 100),
    plannedAmount: safeNumber(input.plannedAmount),
    actualAmount: safeNumber(input.actualAmount),
    notes: String(input.notes ?? "").slice(0, 500),
    isDefault: Boolean(input.isDefault)
  };
}

export function calculateBudgetCategoryTotals(items: BudgetLineItem[], totalActualIncome = 0): BudgetCategoryTotal[] {
  const totals = new Map<string, BudgetCategoryTotal>();
  for (const item of items) {
    const existing = totals.get(item.categoryKey) ?? {
      categoryKey: item.categoryKey,
      categoryName: item.categoryName,
      plannedTotal: 0,
      actualTotal: 0,
      difference: 0,
      percentOfIncome: 0,
      itemCount: 0
    };
    existing.plannedTotal += safeNumber(item.plannedAmount);
    existing.actualTotal += safeNumber(item.actualAmount);
    existing.difference = existing.plannedTotal - existing.actualTotal;
    existing.percentOfIncome = percent(existing.actualTotal, totalActualIncome);
    existing.itemCount += 1;
    totals.set(item.categoryKey, existing);
  }
  return Array.from(totals.values());
}

export function calculateBudgetSummary(income: BudgetLineItem[], expenses: BudgetLineItem[]): BudgetSummary {
  const totalPlannedIncome = income.reduce((sum, item) => sum + safeNumber(item.plannedAmount), 0);
  const totalActualIncome = income.reduce((sum, item) => sum + safeNumber(item.actualAmount), 0);
  const totalPlannedExpenses = expenses.reduce((sum, item) => sum + safeNumber(item.plannedAmount), 0);
  const totalActualExpenses = expenses.reduce((sum, item) => sum + safeNumber(item.actualAmount), 0);
  const plannedSurplus = totalPlannedIncome - totalPlannedExpenses;
  const actualSurplus = totalActualIncome - totalActualExpenses;
  const fixedActual = expenses.filter((item) => item.categoryKey === "fixed-expenses").reduce((sum, item) => sum + safeNumber(item.actualAmount), 0);
  const lifestyleActual = expenses.filter((item) => lifestyleCategoryKeys.has(item.categoryKey)).reduce((sum, item) => sum + safeNumber(item.actualAmount), 0);

  return {
    totalPlannedIncome,
    totalActualIncome,
    totalPlannedExpenses,
    totalActualExpenses,
    plannedSurplus,
    actualSurplus,
    variance: totalPlannedExpenses - totalActualExpenses,
    savingsRate: percent(actualSurplus, totalActualIncome),
    expenseToIncomeRatio: percent(totalActualExpenses, totalActualIncome),
    fixedExpenseRatio: percent(fixedActual, totalActualIncome),
    lifestyleSpendingRatio: percent(lifestyleActual, totalActualIncome)
  };
}

export function calculateBudgetInsights(income: BudgetLineItem[], expenses: BudgetLineItem[]) {
  const summary = calculateBudgetSummary(income, expenses);
  const categoryTotals = calculateBudgetCategoryTotals(expenses, summary.totalActualIncome);
  const largest = [...categoryTotals].sort((a, b) => b.actualTotal - a.actualTotal)[0];
  const overUnder = Math.abs(summary.variance);
  const status = summary.variance < 0 ? `You are over budget by $${overUnder.toFixed(2)}.` : `You are under budget by $${overUnder.toFixed(2)}.`;

  return [
    status,
    largest ? `Your largest category is ${largest.categoryName}.` : "Add expense items to see your largest category.",
    `Your fixed expenses are ${summary.fixedExpenseRatio.toFixed(1)}% of income.`,
    `Your actual savings rate is ${summary.savingsRate.toFixed(1)}%.`
  ];
}

export function validateBudgetInput(input: BudgetInput) {
  const errors: string[] = [];
  const month = normalizeBudgetMonth(input.month);
  const title = String(input.title ?? "").trim();
  const income = Array.isArray(input.income) ? input.income.map(normalizeBudgetLineItem).filter((item): item is BudgetLineItem => Boolean(item)) : [];
  const expenses = Array.isArray(input.expenses) ? input.expenses.map(normalizeBudgetLineItem).filter((item): item is BudgetLineItem => Boolean(item)) : [];

  if (!month) errors.push("Month is required.");
  if (!title) errors.push("Budget title is required.");
  if (title.length > 120) errors.push("Budget title must be 120 characters or fewer.");
  if (income.length === 0) errors.push("At least one income item is required.");

  for (const item of [...income, ...expenses]) {
    if (!Number.isFinite(item.plannedAmount) || item.plannedAmount < 0) errors.push(`${item.itemName} planned amount must be 0 or more.`);
    if (!Number.isFinite(item.actualAmount) || item.actualAmount < 0) errors.push(`${item.itemName} actual amount must be 0 or more.`);
  }

  return {
    errors,
    month,
    title: title.slice(0, 120),
    income,
    expenses,
    notes: String(input.notes ?? "").slice(0, 2000),
    summary: calculateBudgetSummary(income, expenses)
  };
}

export function duplicateBudgetForMonth(input: BudgetInput, newMonth: string) {
  const validated = validateBudgetInput({ ...input, month: newMonth });
  return {
    ...validated,
    income: validated.income.map((item) => ({ ...item, id: crypto.randomUUID(), actualAmount: 0 })),
    expenses: validated.expenses.map((item) => ({ ...item, id: crypto.randomUUID(), actualAmount: 0 })),
    summary: calculateBudgetSummary(
      validated.income.map((item) => ({ ...item, actualAmount: 0 })),
      validated.expenses.map((item) => ({ ...item, actualAmount: 0 }))
    )
  };
}

export function budgetBelongsToUser(budget: { user_id?: string | null } | null | undefined, userId: string) {
  return Boolean(budget?.user_id && budget.user_id === userId);
}
