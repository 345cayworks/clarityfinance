import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json } from "./_utils";
import { ensureRentRoomScenarioTable, resolveRentRoomUserId, type RentRoomScenarioRow } from "./_rentRoomScenarios";

const safeLog = (error: unknown) => {
  if (error instanceof Error) {
    console.error("rent-room-list lookup failed", { name: error.name, message: error.message });
    return;
  }
  console.error("rent-room-list lookup failed", { message: "UnknownError" });
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  try {
    await ensureRentRoomScenarioTable();
    const userId = await resolveRentRoomUserId(access.user.id, access.user.email);
    const scenarios = (await sql`
      SELECT id, title, setup_json, income_json, costs_json, result_json, report_version, created_at, updated_at
      FROM rent_room_scenarios
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC, created_at DESC
    `) as RentRoomScenarioRow[];

    return json(200, { scenarios });
  } catch (error) {
    safeLog(error);
    return json(500, { error: "Failed to load rent-room scenarios." });
  }
};
