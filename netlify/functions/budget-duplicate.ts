import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { writeAuditLog } from "./_audit";
import { buildDuplicateBudgetPayload, ensureMonthlyBudgetsTable } from "./_budget_planner";
import { json, parseJsonBody, randomId } from "./_utils";

type DuplicateBody = {
  id?: unknown;
  newMonth?: unknown;
  targetMonth?: unknown;
};

type SourceBudgetRow = {
  id: string;
  title: string;
  income_json: unknown;
  expenses_json: unknown;
  notes: string | null;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<DuplicateBody>(event) ?? {};
  const sourceId = String(body.id ?? "").trim();
  const newMonth = String(body.newMonth ?? body.targetMonth ?? "").trim();
  if (!sourceId) return json(400, { error: "Source budget id is required." });
  if (!newMonth) return json(400, { error: "Target month is required." });

  await ensureMonthlyBudgetsTable();
  const sourceRows = await sql`
    SELECT id, title, income_json, expenses_json, notes
    FROM monthly_budgets
    WHERE id = ${sourceId}
      AND user_id = ${access.user.id}
    LIMIT 1
  ` as SourceBudgetRow[];

  const source = sourceRows[0];
  if (!source) return json(404, { error: "Budget not found." });

  const duplicated = buildDuplicateBudgetPayload(source, newMonth);
  if (duplicated.errors.length > 0) return json(400, { error: duplicated.errors[0], errors: duplicated.errors });

  const id = randomId("bud");
  const savedRows = await sql`
    INSERT INTO monthly_budgets (
      id, user_id, budget_month, title, income_json, expenses_json, summary_json, notes, created_at, updated_at
    )
    VALUES (
      ${id},
      ${access.user.id},
      ${duplicated.month},
      ${duplicated.title},
      ${JSON.stringify(duplicated.income)}::jsonb,
      ${JSON.stringify(duplicated.expenses)}::jsonb,
      ${JSON.stringify(duplicated.summary)}::jsonb,
      ${duplicated.notes || null},
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
  ` as Array<{ id: string }>;

  await writeAuditLog({
    actor: access.user,
    action: "budget_duplicated",
    entityType: "monthly_budget",
    entityId: savedRows[0]?.id ?? id,
    sourceFunction: "budget-duplicate",
    metadata: { sourceBudgetId: sourceId, budgetMonth: duplicated.month, sourceFunction: "budget-duplicate" }
  });

  return json(200, { success: true, id: savedRows[0]?.id ?? id, budgetMonth: duplicated.month });
};
