import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";
import {
  type AnyRecord,
  ensureRentRoomScenarioTable,
  normalizeReportVersion,
  normalizeScenarioTitle,
  resolveRentRoomUserId,
  withReportAliases
} from "./_rentRoomScenarios";

const safeLog = (error: unknown) => {
  if (error instanceof Error) {
    console.error("rent-room-save database write failed", { name: error.name, message: error.message });
    return;
  }
  console.error("rent-room-save database write failed", { message: "UnknownError" });
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<AnyRecord>(event) ?? {};
  const input = (body.input as AnyRecord | undefined) ?? {};
  const setupJson = ((input.setup as AnyRecord | undefined) ?? {}) as AnyRecord;
  const rawIncomeJson = ((input.income as AnyRecord | undefined) ?? {}) as AnyRecord;
  const costsJson = ((input.costs as AnyRecord | undefined) ?? {}) as AnyRecord;
  const rawResultJson = ((body.result as AnyRecord | undefined) ?? {}) as AnyRecord;
  const { normalizedIncome: incomeJson, normalizedResult: resultJson } = withReportAliases(rawIncomeJson, rawResultJson);
  const title = normalizeScenarioTitle(body.title);
  const reportVersion = normalizeReportVersion(body.reportVersion);
  const scenarioId = typeof body.id === "string" ? body.id.trim() : "";
  const isUpdate = Boolean(scenarioId && body.saveAsNew !== true);

  try {
    await ensureRentRoomScenarioTable();
    const userId = await resolveRentRoomUserId(access.user.id, access.user.email);

    if (isUpdate) {
      const updated = (await sql`
        UPDATE rent_room_scenarios
        SET
          title = ${title},
          setup_json = ${JSON.stringify(setupJson)}::jsonb,
          income_json = ${JSON.stringify(incomeJson)}::jsonb,
          costs_json = ${JSON.stringify(costsJson)}::jsonb,
          result_json = ${JSON.stringify(resultJson)}::jsonb,
          report_version = ${reportVersion},
          updated_at = NOW()
        WHERE id = ${scenarioId}
          AND user_id = ${userId}
        RETURNING id, title, setup_json, income_json, costs_json, result_json, report_version, created_at, updated_at
      `) as AnyRecord[];

      if (!updated[0]) return json(404, { error: "Rent-a-room scenario not found." });
      return json(200, { success: true, id: updated[0].id, scenario: updated[0] });
    }

    const newId = randomId("rrs");
    const inserted = (await sql`
      INSERT INTO rent_room_scenarios (
        id,
        user_id,
        title,
        setup_json,
        income_json,
        costs_json,
        result_json,
        report_version,
        created_at,
        updated_at
      )
      VALUES (
        ${newId},
        ${userId},
        ${title},
        ${JSON.stringify(setupJson)}::jsonb,
        ${JSON.stringify(incomeJson)}::jsonb,
        ${JSON.stringify(costsJson)}::jsonb,
        ${JSON.stringify(resultJson)}::jsonb,
        ${reportVersion},
        NOW(),
        NOW()
      )
      RETURNING id, title, setup_json, income_json, costs_json, result_json, report_version, created_at, updated_at
    `) as AnyRecord[];

    return json(200, { success: true, id: inserted[0]?.id ?? newId, scenario: inserted[0] ?? null });
  } catch (error) {
    safeLog(error);
    return json(500, { error: "Failed to save rent-room scenario." });
  }
};
