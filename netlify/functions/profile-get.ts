import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

type ProfileRow = Record<string, unknown>;
type IncomeSourceRow = Record<string, unknown>;
type ExpenseProfileRow = Record<string, unknown>;
type DebtRow = Record<string, unknown>;
type HousingProfileRow = Record<string, unknown>;
type SavingsProfileRow = Record<string, unknown>;
type GoalRow = Record<string, unknown>;
type ActionPlanRow = Record<string, unknown>;

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  const userId = identityUser.id;
  const results = await Promise.all([
    sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM income_sources WHERE user_id = ${userId} ORDER BY created_at DESC`,
    sql`SELECT * FROM expense_profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM debts WHERE user_id = ${userId} ORDER BY created_at DESC`,
    sql`SELECT * FROM housing_profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM savings_profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM goals WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM action_plans WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`
  ]);

  const profiles = results[0] as ProfileRow[];
  const income = results[1] as IncomeSourceRow[];
  const expenses = results[2] as ExpenseProfileRow[];
  const debts = results[3] as DebtRow[];
  const housing = results[4] as HousingProfileRow[];
  const savings = results[5] as SavingsProfileRow[];
  const goals = results[6] as GoalRow[];
  const plans = results[7] as ActionPlanRow[];

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
