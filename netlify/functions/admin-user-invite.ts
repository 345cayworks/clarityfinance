import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { isPrimaryAdminEmail } from "./_admin";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody, randomId } from "./_utils";

const allowedRoles = new Set(["user", "premium_user", "advisor", "admin", "superadmin"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ email?: string; name?: string; role?: string }>(event) ?? {};
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const role = (body.role ?? "").trim();
  if (!email || !emailPattern.test(email)) return json(400, { error: "Valid email is required" });
  if (!allowedRoles.has(role)) return json(400, { error: "Valid role is required" });
  if (isPrimaryAdminEmail(email)) return json(403, { error: "Permanent admin record cannot be modified" });

  const actorIsSuperadmin = admin.user.role === "superadmin";
  if (!actorIsSuperadmin && role === "superadmin") return json(403, { error: "Only superadmin can invite superadmin" });
  if (!actorIsSuperadmin && role === "admin") return json(403, { error: "Only superadmin can create or promote admin users" });

  const existing = (await sql`SELECT id, email, role, account_status, approval_status FROM users WHERE email = ${email} LIMIT 1`) as Array<{id:string;email:string;role:string;account_status:string;approval_status:string}>;
  if (existing[0]?.role === "superadmin" && !actorIsSuperadmin) return json(403, { error: "Only superadmin can modify an existing superadmin" });
  if (existing[0]?.role === "admin" && !actorIsSuperadmin) return json(403, { error: "Only superadmin can modify an existing admin user" });

  const isUpdate = Boolean(existing[0]);
  const userRows = (await sql`
    INSERT INTO users (id, email, name, role, approval_status, account_status, invited_by, invited_at)
    VALUES (${randomId("usr")}, ${email}, ${name || null}, ${role}, 'approved', 'active', ${admin.user.email}, NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      approval_status = 'approved',
      account_status = 'active',
      invited_by = EXCLUDED.invited_by,
      invited_at = NOW(),
      updated_at = NOW()
    RETURNING id, email, name, role, approval_status, account_status, invited_by, invited_at
  `) as Array<{id:string;email:string;name:string;role:string;approval_status:string;account_status:string;invited_by:string;invited_at:string}>;

  await writeAuditLog({
    actorUserId: admin.user.id,
    actorEmail: admin.user.email,
    action: isUpdate ? "user_invite_updated" : "user_invited",
    targetUserId: userRows[0].id,
    targetEmail: userRows[0].email,
    entityType: "user",
    entityId: userRows[0].id,
    metadata: { role: userRows[0].role }
  });

  return json(200, {
    success: true,
    user: userRows[0],
    message: "User approved in app. Send invite through Netlify Identity or signup link."
  });
};
