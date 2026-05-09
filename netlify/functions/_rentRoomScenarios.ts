import { sql } from "../../lib/db/neon";

export type AnyRecord = Record<string, unknown>;

export type RentRoomScenarioRow = {
  id: string;
  title: string | null;
  setup_json: AnyRecord;
  income_json: AnyRecord;
  costs_json: AnyRecord;
  result_json: AnyRecord;
  report_version: string | null;
  created_at: string;
  updated_at: string;
};

type UserIdRow = { id: string };

export const RENT_ROOM_REPORT_VERSION = "Clarity Report v1.0";

export async function ensureRentRoomScenarioTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS rent_room_scenarios (
      id text PRIMARY KEY,
      user_id text REFERENCES users(id) ON DELETE CASCADE,
      title text,
      setup_json jsonb DEFAULT '{}'::jsonb,
      income_json jsonb DEFAULT '{}'::jsonb,
      costs_json jsonb DEFAULT '{}'::jsonb,
      result_json jsonb DEFAULT '{}'::jsonb,
      report_version text DEFAULT 'Clarity Report v1.0',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`ALTER TABLE rent_room_scenarios DROP CONSTRAINT IF EXISTS rent_room_scenarios_user_id_key`;
  await sql`DROP INDEX IF EXISTS idx_rent_room_scenarios_user_id_unique`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS title text`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS setup_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS income_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS costs_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS result_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS report_version text DEFAULT 'Clarity Report v1.0'`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`;
  await sql`ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`;
  await sql`
    UPDATE rent_room_scenarios
    SET title = 'Rent-a-Room Scenario - ' || to_char(COALESCE(created_at, now()), 'YYYY-MM-DD')
    WHERE title IS NULL OR btrim(title) = ''
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rent_room_scenarios_user_updated
    ON rent_room_scenarios(user_id, updated_at DESC)
  `;
}

export async function resolveRentRoomUserId(identityUserId: string, email: string) {
  const existingUserByEmail = (await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `) as UserIdRow[];
  return existingUserByEmail[0]?.id ?? identityUserId;
}

export function normalizeScenarioTitle(title: unknown) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return trimmed || `Rent-a-Room Scenario - ${new Date().toISOString().slice(0, 10)}`;
}

export function normalizeReportVersion(reportVersion: unknown) {
  const trimmed = typeof reportVersion === "string" ? reportVersion.trim() : "";
  return trimmed || RENT_ROOM_REPORT_VERSION;
}

export function withReportAliases(incomeJson: AnyRecord, resultJson: AnyRecord) {
  const normalizedIncome = {
    ...incomeJson,
    monthlyRent: incomeJson.monthlyRent ?? incomeJson.expectedMonthlyRent ?? 0
  };

  const normalizedResult = {
    ...resultJson,
    netMonthly: resultJson.netMonthly ?? resultJson.netMonthlyProfit ?? 0,
    monthlyNetProfit: resultJson.monthlyNetProfit ?? resultJson.netMonthlyProfit ?? resultJson.netMonthly ?? 0
  };

  return { normalizedIncome, normalizedResult };
}
