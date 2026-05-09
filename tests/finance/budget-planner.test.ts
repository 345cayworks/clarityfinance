import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUDGET_CATEGORIES,
  budgetBelongsToUser,
  calculateBudgetSummary,
  duplicateBudgetForMonth,
  getDefaultBudgetTemplate,
  type BudgetLineItem
} from "@/lib/finance/budget-planner";

const item = (overrides: Partial<BudgetLineItem>): BudgetLineItem => ({
  id: overrides.id ?? "item_1",
  categoryKey: overrides.categoryKey ?? "food",
  categoryName: overrides.categoryName ?? "Food",
  itemName: overrides.itemName ?? "Groceries",
  plannedAmount: overrides.plannedAmount ?? 0,
  actualAmount: overrides.actualAmount ?? 0,
  notes: overrides.notes ?? "",
  isDefault: overrides.isDefault ?? true
});

describe("budget planner", () => {
  it("includes all default categories in the template", () => {
    const template = getDefaultBudgetTemplate();
    const keys = new Set(template.categories.map((category) => category.key));

    expect(template.categories).toHaveLength(DEFAULT_BUDGET_CATEGORIES.length);
    expect(keys).toEqual(new Set(DEFAULT_BUDGET_CATEGORIES.map((category) => category.key)));
    expect(template.income.length).toBeGreaterThan(0);
    expect(template.expenses.length).toBeGreaterThan(0);
  });

  it("calculates planned and actual totals correctly", () => {
    const summary = calculateBudgetSummary(
      [item({ categoryKey: "income", categoryName: "Income", plannedAmount: 5000, actualAmount: 5200 })],
      [
        item({ plannedAmount: 1000, actualAmount: 900 }),
        item({ categoryKey: "fixed-expenses", categoryName: "Fixed Expenses", plannedAmount: 1500, actualAmount: 1600 })
      ]
    );

    expect(summary.totalPlannedIncome).toBe(5000);
    expect(summary.totalActualIncome).toBe(5200);
    expect(summary.totalPlannedExpenses).toBe(2500);
    expect(summary.totalActualExpenses).toBe(2500);
  });

  it("calculates surplus correctly", () => {
    const summary = calculateBudgetSummary(
      [item({ categoryKey: "income", categoryName: "Income", plannedAmount: 4000, actualAmount: 4100 })],
      [item({ plannedAmount: 2800, actualAmount: 3000 })]
    );

    expect(summary.plannedSurplus).toBe(1200);
    expect(summary.actualSurplus).toBe(1100);
  });

  it("calculates over and under budget as planned expenses minus actual expenses", () => {
    const underBudget = calculateBudgetSummary([], [item({ plannedAmount: 1000, actualAmount: 800 })]);
    const overBudget = calculateBudgetSummary([], [item({ plannedAmount: 1000, actualAmount: 1200 })]);

    expect(underBudget.variance).toBe(200);
    expect(overBudget.variance).toBe(-200);
  });

  it("handles zero income safely for savings rate", () => {
    const summary = calculateBudgetSummary([], [item({ plannedAmount: 100, actualAmount: 100 })]);

    expect(summary.savingsRate).toBe(0);
    expect(Number.isFinite(summary.savingsRate)).toBe(true);
  });

  it("handles zero income safely for expense-to-income ratio", () => {
    const summary = calculateBudgetSummary([], [item({ plannedAmount: 100, actualAmount: 100 })]);

    expect(summary.expenseToIncomeRatio).toBe(0);
    expect(Number.isFinite(summary.expenseToIncomeRatio)).toBe(true);
  });

  it("duplicates a budget into a new month and resets actuals to zero", () => {
    const duplicated = duplicateBudgetForMonth({
      month: "2026-05",
      title: "May budget",
      income: [item({ categoryKey: "income", categoryName: "Income", plannedAmount: 5000, actualAmount: 5100 })],
      expenses: [item({ plannedAmount: 1200, actualAmount: 1300 })],
      notes: "Carry forward"
    }, "2026-06");

    expect(duplicated.month).toBe("2026-06");
    expect(duplicated.income[0]?.actualAmount).toBe(0);
    expect(duplicated.expenses[0]?.actualAmount).toBe(0);
    expect(duplicated.summary.totalActualIncome).toBe(0);
    expect(duplicated.summary.totalActualExpenses).toBe(0);
  });

  it("rejects another user's budget ownership", () => {
    expect(budgetBelongsToUser({ user_id: "user_a" }, "user_b")).toBe(false);
    expect(budgetBelongsToUser({ user_id: "user_a" }, "user_a")).toBe(true);
  });
});
