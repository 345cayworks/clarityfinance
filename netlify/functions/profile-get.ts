import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { json, requireSession } from "./_utils";

type ProfileRow = Record<string, unknown>;
type IncomeSourceRow = Record<string, unknown>;
type ExpenseProfileRow = Record<string, unknown>;
type DebtRow = Record<string, unknown>;
type HousingProfileRow = Record<string, unknown>;
type SavingsProfileRow = Record<string, unknown>;
type GoalRow = Record<string, unknown>;
type ActionPlanRow = Record<string, unknown>;

export const handler: Handler = async (event) => {
  const session = await requireSession(event);
  if (!session) return json(401, { error: "Unauthorized" });

  const userId = session.sub;
  const [profiles, income, expenses, debts, housing, savings, goals, plans] = await Promise.all([
    sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1` as ProfileRow[],
    sql`SELECT * FROM income_sources WHERE user_id = ${userId} ORDER BY created_at DESC` as IncomeSourceRow[],
    sql`SELECT * FROM expense_profiles WHERE user_id = ${userId} LIMIT 1` as ExpenseProfileRow[],
    sql`SELECT * FROM debts WHERE user_id = ${userId} ORDER BY created_at DESC` as DebtRow[],
    sql`SELECT * FROM housing_profiles WHERE user_id = ${userId} LIMIT 1` as HousingProfileRow[],
    sql`SELECT * FROM savings_profiles WHERE user_id = ${userId} LIMIT 1` as SavingsProfileRow[],
    sql`SELECT * FROM goals WHERE user_id = ${userId} LIMIT 1` as GoalRow[],
    sql`SELECT * FROM action_plans WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1` as ActionPlanRow[]
  ]);

  return json(200, {
    profile: profiles[0] ?? null,
    incomeSources: income,
    expenseProfile: expenses[0] ?? null,
    debts,
    housingProfile: housing[0] ?? null,
    savingsProfile: savings[0] ?? null,
    goals: goals[0] ?? null,
    actionPlan: plans[0] ?? null
  });
};
