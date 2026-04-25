import type { Handler } from "@netlify/functions";
import { randomId } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { json, parseJsonBody, requireSession } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const session = await requireSession(event);
  if (!session) return json(401, { error: "Unauthorized" });

  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  const adjustments = {
    incomeIncrease: Number(body.incomeIncrease ?? 0),
    expenseReduction: Number(body.expenseReduction ?? 0),
    debtPaydown: Number(body.debtPaydown ?? 0),
    rentalIncome: Number(body.rentalIncome ?? 0),
    lowerRate: Number(body.lowerRate ?? 0),
    savingsIncrease: Number(body.savingsIncrease ?? 0)
  };

  await sql`
    INSERT INTO scenarios (id, user_id, name, adjustments_json, result_json)
    VALUES (${randomId("scn")}, ${session.sub}, ${String(body.name ?? "Scenario")}, ${JSON.stringify(adjustments)}::jsonb, ${JSON.stringify(adjustments)}::jsonb)
  `;

  return json(200, { success: true });
};
