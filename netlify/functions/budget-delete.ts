import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { writeAuditLog } from "./_audit";
import { ensureMonthlyBudgetsTable } from "./_budget_planner";
import { json, parseJsonBody } from "./_utils";

type DeleteBody = {
  id?: unknown;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<DeleteBody>(event) ?? {};
  const id = String(body.id ?? event.queryStringParameters?.id ?? "").trim();
  if (!id) return json(400, { error: "Budget id is required." });

  await ensureMonthlyBudgetsTable();
  const deletedRows = await sql`
    DELETE FROM monthly_budgets
    WHERE id = ${id}
      AND user_id = ${access.user.id}
    RETURNING id, title, budget_month
  `;

  const deleted = deletedRows[0] as { id: string; title: string; budget_month: string } | undefined;
  if (!deleted) return json(404, { error: "Budget not found." });

  await writeAuditLog({
    actor: access.user,
    action: "budget_deleted",
    entityType: "monthly_budget",
    entityId: deleted.id,
    sourceFunction: "budget-delete",
    metadata: { budgetMonth: deleted.budget_month, title: deleted.title, sourceFunction: "budget-delete" }
  });

  return json(200, { success: true });
};
