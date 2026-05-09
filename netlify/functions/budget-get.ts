import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { ensureMonthlyBudgetsTable } from "./_budget_planner";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const id = String(event.queryStringParameters?.id ?? "").trim();
  if (!id) return json(400, { error: "Budget id is required." });

  await ensureMonthlyBudgetsTable();
  const rows = await sql`
    SELECT id, title, budget_month, income_json, expenses_json, summary_json, notes, created_at, updated_at
    FROM monthly_budgets
    WHERE id = ${id}
      AND user_id = ${access.user.id}
    LIMIT 1
  `;

  if (!rows[0]) return json(404, { error: "Budget not found." });

  return json(200, { success: true, budget: rows[0] });
};
