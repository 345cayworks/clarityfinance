import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { requireAdmin } from "./_admin";
import { json, parseJsonBody } from "./_utils";

const allowedRoles = new Set(["user", "advisor", "admin"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });
  if (!(await requireAdmin(identityUser))) return json(403, { error: "Forbidden" });
  const body = parseJsonBody<{ userId?: string; role?: string }>(event) ?? {};
  if (!body.userId || !body.role || !allowedRoles.has(body.role)) return json(400, { error: "Valid userId and role are required" });

  await sql`UPDATE users SET role=${body.role}, updated_at=NOW() WHERE id=${body.userId}`;
  return json(200, { success: true });
};
