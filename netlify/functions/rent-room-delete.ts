import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody } from "./_utils";
import { ensureRentRoomScenarioTable, resolveRentRoomUserId, type AnyRecord } from "./_rentRoomScenarios";

const safeLog = (error: unknown) => {
  if (error instanceof Error) {
    console.error("rent-room-delete failed", { name: error.name, message: error.message });
    return;
  }
  console.error("rent-room-delete failed", { message: "UnknownError" });
};

export const handler: Handler = async (event) => {
  if (!["DELETE", "POST"].includes(event.httpMethod)) return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<AnyRecord>(event) ?? {};
  const scenarioId = String(body.id ?? event.queryStringParameters?.id ?? "").trim();
  if (!scenarioId) return json(400, { error: "Scenario id is required." });

  try {
    await ensureRentRoomScenarioTable();
    const userId = await resolveRentRoomUserId(access.user.id, access.user.email);
    const deleted = (await sql`
      DELETE FROM rent_room_scenarios
      WHERE id = ${scenarioId}
        AND user_id = ${userId}
      RETURNING id
    `) as Array<{ id: string }>;

    if (!deleted[0]) return json(404, { error: "Rent-a-room scenario not found." });
    return json(200, { success: true, id: deleted[0].id });
  } catch (error) {
    safeLog(error);
    return json(500, { error: "Failed to delete rent-room scenario." });
  }
};
