import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumUser } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const access = await requirePremiumUser(event);
  if (!access.ok) return json(access.statusCode, access.body);
  const rows = await sql`SELECT * FROM loan_readiness_applications WHERE user_id = ${access.user.id} ORDER BY updated_at DESC LIMIT 1` as Record<string, unknown>[];
  return json(200, { success: true, application: rows[0] ?? null });
};
