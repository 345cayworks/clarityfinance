import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumOrStaff } from "./_access";
import { writeAuditLog } from "./_audit";
import {
  DIVIDEND_CALCULATOR_ASSUMPTIONS,
  DIVIDEND_CALCULATOR_DISCLAIMER,
  DIVIDEND_CALCULATOR_REPORT_VERSION,
  ensureDividendCalculatorSavesTable,
  validateSaveBody,
  type DividendCalculatorSaveBody
} from "./_dividend_calculator_saves";
import { json, parseJsonBody, randomId } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const access = await requirePremiumOrStaff(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<DividendCalculatorSaveBody>(event);
  if (!body) return json(400, { error: "Invalid request body." });

  const validated = validateSaveBody(body);
  if (validated.errors.length > 0) return json(400, { error: validated.errors[0], errors: validated.errors });

  const requestedId = typeof body.id === "string" ? body.id.trim() : "";
  const id = requestedId || randomId("dcs");
  const isUpdate = Boolean(requestedId);

  await ensureDividendCalculatorSavesTable();
  const savedRows = isUpdate
    ? await sql`
    UPDATE dividend_calculator_saves SET
      title = ${validated.title},
      positions_json = ${JSON.stringify(validated.positions)}::jsonb,
      settings_json = ${JSON.stringify(validated.settings)}::jsonb,
      summary_json = ${JSON.stringify(validated.summary)}::jsonb,
      projection_json = ${JSON.stringify(validated.projection)}::jsonb,
      report_version = ${DIVIDEND_CALCULATOR_REPORT_VERSION},
      disclaimer_text = ${DIVIDEND_CALCULATOR_DISCLAIMER},
      assumptions_json = ${JSON.stringify(DIVIDEND_CALCULATOR_ASSUMPTIONS)}::jsonb,
      updated_at = NOW()
    WHERE id = ${id}
      AND user_id = ${access.user.id}
    RETURNING id
  ` as Array<{ id: string }>
    : await sql`
    INSERT INTO dividend_calculator_saves (
      id,
      user_id,
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
    )
    VALUES (
      ${id},
      ${access.user.id},
      ${validated.title},
      ${JSON.stringify(validated.positions)}::jsonb,
      ${JSON.stringify(validated.settings)}::jsonb,
      ${JSON.stringify(validated.summary)}::jsonb,
      ${JSON.stringify(validated.projection)}::jsonb,
      ${DIVIDEND_CALCULATOR_REPORT_VERSION},
      ${DIVIDEND_CALCULATOR_DISCLAIMER},
      ${JSON.stringify(DIVIDEND_CALCULATOR_ASSUMPTIONS)}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id
  ` as Array<{ id: string }>;

  if (!savedRows[0]) return json(404, { error: "Saved projection not found." });

  await writeAuditLog({
    actor: access.user,
    action: isUpdate ? "dividend_calculator_updated" : "dividend_calculator_saved",
    entityType: "dividend_calculator_save",
    entityId: id,
    sourceFunction: "dividend-calculator-save",
    metadata: {
      saveId: id,
      title: validated.title,
      positionCount: validated.positions.length,
      sourceFunction: "dividend-calculator-save"
    }
  });

  return json(200, { success: true, id });
};
