import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";

type AnyRecord = Record<string, unknown>;
type UserIdRow = { id: string };

const safeLog = (error: unknown) => {
  if (error instanceof Error) {
    console.error("rent-room-save database write failed", { name: error.name, message: error.message });
    return;
  }
  console.error("rent-room-save database write failed", { message: "UnknownError" });
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
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<AnyRecord>(event) ?? {};
  const input = (body.input as AnyRecord | undefined) ?? {};
  const setupJson = ((input.setup as AnyRecord | undefined) ?? {}) as AnyRecord;
  const incomeJson = ((input.income as AnyRecord | undefined) ?? {}) as AnyRecord;
  const costsJson = ((input.costs as AnyRecord | undefined) ?? {}) as AnyRecord;
  const resultJson = ((body.result as AnyRecord | undefined) ?? {}) as AnyRecord;

  try {
    await ensureRentRoomScenarioTable();
    const userId = await resolveUserId(access.user.id, access.user.email);

    await sql`
      INSERT INTO rent_room_scenarios (id, user_id, setup_json, income_json, costs_json, result_json, created_at, updated_at)
      VALUES (
        ${randomId("rrs")},
        ${userId},
        ${JSON.stringify(setupJson)}::jsonb,
        ${JSON.stringify(incomeJson)}::jsonb,
        ${JSON.stringify(costsJson)}::jsonb,
        ${JSON.stringify(resultJson)}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        setup_json = EXCLUDED.setup_json,
        income_json = EXCLUDED.income_json,
        costs_json = EXCLUDED.costs_json,
        result_json = EXCLUDED.result_json,
        updated_at = NOW()
    `;
  } catch (error) {
    safeLog(error);
    return json(500, { error: "Failed to save rent-room scenario." });
  }

  return json(200, { success: true });
};
