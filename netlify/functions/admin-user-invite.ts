import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_admin";
import { json, parseJsonBody, randomId } from "./_utils";

const allowedRoles = new Set(["user", "advisor", "admin"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ email?: string; name?: string; role?: string }>(event) ?? {};
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const role = allowedRoles.has(body.role ?? "") ? (body.role as string) : "user";
  if (!email) return json(400, { error: "email is required" });

  await sql`
    INSERT INTO users (id, email, name, role, approval_status, account_status, invited_by, invited_at)
    VALUES (${randomId("usr")}, ${email}, ${name || null}, ${role}, 'approved', 'active', ${admin.identityUser.email}, NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      approval_status = 'approved',
      account_status = 'active',
      invited_by = EXCLUDED.invited_by,
      invited_at = NOW(),
      updated_at = NOW()
  `;

  return json(200, {
    success: true,
    message: "User approved in app. Send invite through Netlify Identity or signup link."
  });
};
