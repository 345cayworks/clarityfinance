import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { ADMIN_EMAIL } from "./_admin";
import { json, parseJsonBody } from "./_utils";

const allowedRoles = new Set(["user", "premium_user", "advisor", "admin", "superadmin", "premium"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ userId?: string; role?: string }>(event) ?? {};
  if (!body.userId || !body.role || !allowedRoles.has(body.role)) return json(400, { error: "Valid userId and role are required" });

  const target = (await sql`SELECT email FROM users WHERE id = ${body.userId} LIMIT 1`) as Array<{ email: string }>;
  if (target[0]?.email?.toLowerCase() === ADMIN_EMAIL) {
    return json(403, { error: "Primary admin role cannot be changed" });
  }

  await sql`UPDATE users SET role=${body.role}, updated_at=NOW() WHERE id=${body.userId}`;
  return json(200, { success: true });
};
