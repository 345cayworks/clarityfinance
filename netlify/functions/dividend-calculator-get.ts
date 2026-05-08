import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumOrStaff } from "./_access";
import { ensureDividendCalculatorSavesTable } from "./_dividend_calculator_saves";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requirePremiumOrStaff(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const id = String(event.queryStringParameters?.id ?? "").trim();
  if (!id) return json(400, { error: "Save id is required." });

  await ensureDividendCalculatorSavesTable();
  const rows = await sql`
    SELECT
      id,
      title,
      positions_json,
      settings_json,
      summary_json,
      projection_json,
      report_version,
      disclaimer_text,
      assumptions_json,
      created_at,
      updated_at
    FROM dividend_calculator_saves
    WHERE id = ${id}
      AND user_id = ${access.user.id}
    LIMIT 1
  `;

  if (!rows[0]) return json(404, { error: "Saved projection not found." });

  return json(200, { success: true, save: rows[0] });
};
