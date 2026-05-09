import { sql } from "../../lib/db/neon";
import {
  calculateBudgetSummary,
  duplicateBudgetForMonth,
  normalizeBudgetMonth,
  validateBudgetInput,
  type BudgetInput,
  type BudgetLineItem
} from "../../lib/finance/budget-planner";

export type BudgetSaveBody = {
  id?: unknown;
  month?: unknown;
  budget_month?: unknown;
  title?: unknown;
  income?: unknown;
  expenses?: unknown;
  notes?: unknown;
};

export async function ensureMonthlyBudgetsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      budget_month TEXT NOT NULL,
      title TEXT NOT NULL,
      income_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      expenses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_budgets_user_month
    ON monthly_budgets(user_id, budget_month)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_updated
    ON monthly_budgets(user_id, updated_at DESC)
  `;
}

function asLineItems(value: unknown): BudgetLineItem[] {
  return Array.isArray(value) ? value as BudgetLineItem[] : [];
}

export function validateBudgetSaveBody(body: BudgetSaveBody) {
  const input: BudgetInput = {
    month: String(body.month ?? body.budget_month ?? ""),
    title: String(body.title ?? ""),
    income: asLineItems(body.income),
    expenses: asLineItems(body.expenses),
    notes: String(body.notes ?? "")
  };
  return validateBudgetInput(input);
}

export function buildDuplicateBudgetPayload(source: {
  title: string;
  income_json: unknown;
  expenses_json: unknown;
  notes: string | null;
}, newMonth: string) {
  const duplicated = duplicateBudgetForMonth({
    month: normalizeBudgetMonth(newMonth),
    title: source.title,
    income: asLineItems(source.income_json),
    expenses: asLineItems(source.expenses_json),
    notes: source.notes ?? ""
  }, newMonth);

  return {
    ...duplicated,
    summary: calculateBudgetSummary(duplicated.income, duplicated.expenses)
  };
}
