import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { ensureMonthlyBudgetsTable } from "./_budget_planner";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  await ensureMonthlyBudgetsTable();
  const budgets = await sql`
    SELECT
      id,
      title,
      budget_month,
      updated_at,
      jsonb_build_object(
        'totalPlannedIncome', summary_json -> 'totalPlannedIncome',
        'totalActualIncome', summary_json -> 'totalActualIncome',
        'totalPlannedExpenses', summary_json -> 'totalPlannedExpenses',
        'totalActualExpenses', summary_json -> 'totalActualExpenses',
        'actualSurplus', summary_json -> 'actualSurplus',
        'variance', summary_json -> 'variance'
      ) AS summary_preview
    FROM monthly_budgets
    WHERE user_id = ${access.user.id}
    ORDER BY budget_month DESC, updated_at DESC
  `;

  return json(200, { success: true, budgets });
};
