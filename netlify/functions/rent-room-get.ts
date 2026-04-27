import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

type UserIdRow = { id: string };
type RentRoomRow = {
  id: string;
  setup_json: Record<string, unknown>;
  income_json: Record<string, unknown>;
  costs_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  updated_at: string;
};

const safeLog = (error: unknown) => {
  if (error instanceof Error) {
    console.error("rent-room-get lookup failed", { name: error.name, message: error.message });
    return;
  }
  console.error("rent-room-get lookup failed", { message: "UnknownError" });
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  try {
    const existingUserByEmail = (await sql`
      SELECT id FROM users WHERE email = ${identityUser.email} LIMIT 1
    `) as UserIdRow[];
    const userId = existingUserByEmail[0]?.id ?? identityUser.id;

    const scenarios = (await sql`
      SELECT id, setup_json, income_json, costs_json, result_json, updated_at
      FROM rent_room_scenarios
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 1
    `) as RentRoomRow[];

    return json(200, { scenario: scenarios[0] ?? null });
  } catch (error) {
    safeLog(error);
    return json(500, { error: "Failed to load rent-room scenario." });
  }
};
