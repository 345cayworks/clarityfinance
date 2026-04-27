import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  const existingUserByEmail = (await sql`
    SELECT id FROM users WHERE email = ${identityUser.email} LIMIT 1
  `) as UserIdRow[];
  const userId = existingUserByEmail[0]?.id ?? identityUser.id;

  const body = parseJsonBody<AnyRecord>(event) ?? {};
  const input = (body.input as AnyRecord | undefined) ?? {};
  const setupJson = ((input.setup as AnyRecord | undefined) ?? {}) as AnyRecord;
  const incomeJson = ((input.income as AnyRecord | undefined) ?? {}) as AnyRecord;
  const costsJson = ((input.costs as AnyRecord | undefined) ?? {}) as AnyRecord;
  const resultJson = ((body.result as AnyRecord | undefined) ?? {}) as AnyRecord;

  try {
    await sql`
      INSERT INTO rent_room_scenarios (id, user_id, setup_json, income_json, costs_json, result_json)
      VALUES (
        ${randomId("rrs")},
        ${userId},
        ${JSON.stringify(setupJson)}::jsonb,
        ${JSON.stringify(incomeJson)}::jsonb,
        ${JSON.stringify(costsJson)}::jsonb,
        ${JSON.stringify(resultJson)}::jsonb
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
