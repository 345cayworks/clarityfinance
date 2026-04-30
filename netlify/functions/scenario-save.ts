import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody } from "./_utils";

type UserRow = { id: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const existingUser = (await sql`
    SELECT id FROM users WHERE email = ${access.user.email} LIMIT 1
  `) as UserRow[];

  if (!existingUser[0]) {
    return json(400, { error: "User not found in database" });
  }

  const userId = existingUser[0].id;

  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  const name = String(body.name ?? "Scenario");
  const adjustments = (body.adjustments as Record<string, unknown> | undefined) ?? {};
  const result = (body.result as Record<string, unknown> | undefined) ?? {};

  const safeAdjustments = JSON.parse(JSON.stringify(adjustments));
  const safeResult = JSON.parse(JSON.stringify(result));

  try {
    await sql`
      INSERT INTO scenarios (
        id,
        user_id,
        name,
        adjustments_json,
        result_json,
        created_at,
        updated_at
      )
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${name},
        ${safeAdjustments},
        ${safeResult},
        NOW(),
        NOW()
      )
    `;
  } catch (err) {
    if (err instanceof Error) {
      console.error("scenario-save database write failed", {
        name: err.name,
        message: err.message
      });
    } else {
      console.error("scenario-save database write failed", {
        name: "UnknownError",
        message: String(err)
      });
    }

    return json(500, { error: "Failed to save scenario." });
  }

  return json(200, { success: true });
};
