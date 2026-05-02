import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ userId?: string }>(event) ?? {};
  const userId = (body.userId ?? "").trim();
  if (!userId) return json(400, { error: "userId is required" });

  const updated = await sql`
    UPDATE users
    SET approval_status='approved', approved_at=NOW(), approved_by=${admin.user.email}, rejection_reason=NULL, updated_at=NOW()
    WHERE id=${userId}
    RETURNING id, email, name, role, approval_status, account_status
  ` as Array<{id:string;email:string;name:string;role:string;approval_status:string;account_status:string}>;
  if (!updated[0]) return json(404, { error: "User not found" });

  await notifyUser(updated[0].id, "user_approved", { userId });
  await writeAuditLog({ actorUserId: admin.user.id, actorEmail: admin.user.email, action: "user_approved", targetUserId: updated[0].id, targetEmail: updated[0].email, entityType: "user", entityId: updated[0].id });
  return json(200, { success: true, user: updated[0] });
};
