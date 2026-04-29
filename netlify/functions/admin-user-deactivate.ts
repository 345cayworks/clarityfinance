import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { ADMIN_EMAIL, requireAdmin } from "./_admin";
import { json, parseJsonBody } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ userId?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  const target = (await sql`SELECT email FROM users WHERE id = ${body.userId} LIMIT 1`) as Array<{ email: string }>;
  if (target[0]?.email?.toLowerCase() === ADMIN_EMAIL) {
    return json(403, { error: "Primary admin cannot be deactivated" });
  }

  await sql`UPDATE users SET account_status='deactivated', deactivated_at=NOW(), updated_at=NOW() WHERE id=${body.userId}`;
  return json(200, { success: true });
};
