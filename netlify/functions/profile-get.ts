import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { json, requireSession } from "./_utils";

export const handler: Handler = async (event) => {
  const session = await requireSession(event);
  if (!session) return json(401, { error: "Unauthorized" });

  const userId = session.sub;
  const [profiles, income, expenses, debts, housing, savings, goals, plans] = await Promise.all([
    sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM income_sources WHERE user_id = ${userId} ORDER BY created_at DESC`,
    sql`SELECT * FROM expense_profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM debts WHERE user_id = ${userId} ORDER BY created_at DESC`,
    sql`SELECT * FROM housing_profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM savings_profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM goals WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM action_plans WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`
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
