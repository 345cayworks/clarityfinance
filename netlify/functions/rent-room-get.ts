import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
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

async function ensureRentRoomScenarioTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS rent_room_scenarios (
      id text PRIMARY KEY,
      user_id text REFERENCES users(id) ON DELETE CASCADE,
      setup_json jsonb DEFAULT '{}'::jsonb,
      income_json jsonb DEFAULT '{}'::jsonb,
      costs_json jsonb DEFAULT '{}'::jsonb,
      result_json jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE rent_room_scenarios
    ADD COLUMN IF NOT EXISTS setup_json jsonb DEFAULT '{}'::jsonb
  `;
  await sql`
    ALTER TABLE rent_room_scenarios
    ADD COLUMN IF NOT EXISTS income_json jsonb DEFAULT '{}'::jsonb
  `;
  await sql`
    ALTER TABLE rent_room_scenarios
    ADD COLUMN IF NOT EXISTS costs_json jsonb DEFAULT '{}'::jsonb
  `;
  await sql`
    ALTER TABLE rent_room_scenarios
    ADD COLUMN IF NOT EXISTS result_json jsonb DEFAULT '{}'::jsonb
  `;
  await sql`
    ALTER TABLE rent_room_scenarios
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()
  `;
  await sql`
    ALTER TABLE rent_room_scenarios
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
  `;
  await sql`
    DELETE FROM rent_room_scenarios a
    USING rent_room_scenarios b
    WHERE a.user_id = b.user_id
      AND a.id <> b.id
      AND COALESCE(a.updated_at, a.created_at, now()) < COALESCE(b.updated_at, b.created_at, now())
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_room_scenarios_user_id_unique
    ON rent_room_scenarios(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rent_room_scenarios_updated_at
    ON rent_room_scenarios(updated_at DESC)
  `;
}

async function resolveUserId(identityUserId: string, email: string) {
  const existingUserByEmail = (await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `) as UserIdRow[];
  return existingUserByEmail[0]?.id ?? identityUserId;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  try {
    await ensureRentRoomScenarioTable();
    const userId = await resolveUserId(access.user.id, access.user.email);

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
