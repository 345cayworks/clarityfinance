import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { ADMIN_EMAIL } from "./_admin";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";

const allowedRoles = new Set(["user", "premium_user", "advisor", "admin", "superadmin"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ userId?: string; role?: string }>(event) ?? {};
  const userId = (body.userId ?? "").trim();
  const role = (body.role ?? "").trim();
  if (!userId || !allowedRoles.has(role)) return json(400, { error: "Valid userId and role are required" });

  const actorRole = admin.user.role;
  const actorIsSuperadmin = actorRole === "superadmin";
  if (admin.user.id === userId) return json(403, { error: "You cannot change your own role" });

  const targetRows = (await sql`SELECT id, email, role, account_status, approval_status FROM users WHERE id = ${userId} LIMIT 1`) as Array<{id:string;email:string;role:string;account_status:string;approval_status:string}>;
  const target = targetRows[0];
  if (!target) return json(404, { error: "User not found" });
  if (target.email.toLowerCase() === ADMIN_EMAIL) return json(403, { error: "Primary admin role cannot be changed" });
  if (!actorIsSuperadmin && role === "superadmin") return json(403, { error: "Only superadmin can assign superadmin role" });
  if (!actorIsSuperadmin && target.role === "superadmin") return json(403, { error: "Only superadmin can modify a superadmin" });

  const updatedRows = (await sql`
    UPDATE users
    SET role = ${role}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id, email, role, account_status, approval_status
  `) as Array<{id:string;email:string;role:string;account_status:string;approval_status:string}>;

  if (!updatedRows[0]) return json(404, { error: "User not found" });

  await writeAuditLog({
    actorUserId: admin.user.id,
    actorEmail: admin.user.email,
    action: "user_role_updated",
    targetUserId: updatedRows[0].id,
    targetEmail: updatedRows[0].email,
    entityType: "user",
    entityId: updatedRows[0].id,
    metadata: { previousRole: target.role, newRole: updatedRows[0].role }
  });

  return json(200, { success: true, user: updatedRows[0] });
};
