import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { writeAuditLog } from "./_audit";
import { ensureMonthlyBudgetsTable, validateBudgetSaveBody, type BudgetSaveBody } from "./_budget_planner";
import { json, parseJsonBody, randomId } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<BudgetSaveBody>(event);
  if (!body) return json(400, { error: "Invalid request body." });

  const validated = validateBudgetSaveBody(body);
  if (validated.errors.length > 0) return json(400, { error: validated.errors[0], errors: validated.errors });

  const requestedId = typeof body.id === "string" ? body.id.trim() : "";
  const id = requestedId || randomId("bud");

  await ensureMonthlyBudgetsTable();
  const rows = requestedId
    ? await sql`
      UPDATE monthly_budgets SET
        budget_month = ${validated.month},
        title = ${validated.title},
        income_json = ${JSON.stringify(validated.income)}::jsonb,
        expenses_json = ${JSON.stringify(validated.expenses)}::jsonb,
        summary_json = ${JSON.stringify(validated.summary)}::jsonb,
        notes = ${validated.notes || null},
        updated_at = NOW()
      WHERE id = ${id}
        AND user_id = ${access.user.id}
      RETURNING id
    `
    : await sql`
      INSERT INTO monthly_budgets (
        id, user_id, budget_month, title, income_json, expenses_json, summary_json, notes, created_at, updated_at
      )
      VALUES (
        ${id},
        ${access.user.id},
        ${validated.month},
        ${validated.title},
        ${JSON.stringify(validated.income)}::jsonb,
        ${JSON.stringify(validated.expenses)}::jsonb,
        ${JSON.stringify(validated.summary)}::jsonb,
        ${validated.notes || null},
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, budget_month) DO UPDATE SET
        title = EXCLUDED.title,
        income_json = EXCLUDED.income_json,
        expenses_json = EXCLUDED.expenses_json,
        summary_json = EXCLUDED.summary_json,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id
    `;

  const saved = rows[0] as { id: string } | undefined;
  if (!saved) return json(404, { error: "Budget not found." });

  await writeAuditLog({
    actor: access.user,
    action: requestedId ? "budget_updated" : "budget_saved",
    entityType: "monthly_budget",
    entityId: saved.id,
    sourceFunction: "budget-save",
    metadata: { budgetMonth: validated.month, sourceFunction: "budget-save" }
  });

  return json(200, { success: true, id: saved.id, summary: validated.summary });
};
