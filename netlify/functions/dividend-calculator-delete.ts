import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumOrStaff } from "./_access";
import { writeAuditLog } from "./_audit";
import { ensureDividendCalculatorSavesTable } from "./_dividend_calculator_saves";
import { json, parseJsonBody } from "./_utils";

type DeleteBody = {
  id?: unknown;
};

type DeletedRow = {
  id: string;
  title: string;
  position_count: number;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") return json(405, { error: "Method not allowed" });

  const access = await requirePremiumOrStaff(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<DeleteBody>(event) ?? {};
  const id = String(body.id ?? "").trim();
  if (!id) return json(400, { error: "Save id is required." });

  await ensureDividendCalculatorSavesTable();
  const deletedRows = await sql`
    DELETE FROM dividend_calculator_saves
    WHERE id = ${id}
      AND user_id = ${access.user.id}
    RETURNING id, title, jsonb_array_length(positions_json) AS position_count
  ` as DeletedRow[];

  const deleted = deletedRows[0];
  if (!deleted) return json(404, { error: "Saved projection not found." });

  await writeAuditLog({
    actor: access.user,
    action: "dividend_calculator_deleted",
    entityType: "dividend_calculator_save",
    entityId: deleted.id,
    sourceFunction: "dividend-calculator-delete",
    metadata: {
      saveId: deleted.id,
      title: deleted.title,
      positionCount: Number(deleted.position_count ?? 0),
      sourceFunction: "dividend-calculator-delete"
    }
  });

  return json(200, { success: true });
};
