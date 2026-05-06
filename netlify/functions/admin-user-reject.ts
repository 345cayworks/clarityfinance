import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { isPrimaryAdminEmail } from "./_admin";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ userId?: string; reason?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  const target = await sql`SELECT id,email,name,role FROM users WHERE id=${body.userId} LIMIT 1` as Array<{id:string;email:string;name:string;role:string}>;
  if (!target[0]) return json(404, { error: "User not found" });
  if (isPrimaryAdminEmail(target[0].email)) return json(403, { error: "Primary superadmin cannot be rejected" });
  if (target[0].role === "superadmin" && admin.user.role !== "superadmin") return json(403, { error: "Only superadmin can modify a superadmin" });
  const rejected = Boolean((body.reason ?? '').trim());
  if (rejected) {
    await sql`UPDATE users SET approval_status='rejected', rejection_reason=${body.reason ?? ''}, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  } else {
    await sql`UPDATE users SET approval_status='pending', rejection_reason=NULL, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  }
  await writeAuditLog({
    actorUserId: admin.user.id,
    actorEmail: admin.user.email,
    actorRole: admin.user.role,
    action: rejected ? "user_rejected" : "user_rejection_cleared",
    targetUserId: target[0].id,
    targetEmail: target[0].email,
    entityType: "user",
    entityId: target[0].id,
    sourceFunction: "admin-user-reject",
    metadata: { previousRole: target[0].role, reasonProvided: rejected }
  });
  if (target[0]?.id && (body.reason ?? '').trim()) await notifyUser(target[0].id, "user_rejected", { userId: body.userId, reason: body.reason ?? '' });
  return json(200, { success: true });
};
