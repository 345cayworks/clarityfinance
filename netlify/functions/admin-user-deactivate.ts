import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { ADMIN_EMAIL } from "./_admin";
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

  const targetRows = (await sql`SELECT id, email, name, role FROM users WHERE id = ${userId} LIMIT 1`) as Array<{id:string;email:string;name:string;role:string}>;
  const target = targetRows[0];
  if (!target) return json(404, { error: "User not found" });
  if (target.email.toLowerCase() === ADMIN_EMAIL) return json(403, { error: "Primary admin cannot be deactivated" });
  if (target.id === admin.user.id) return json(403, { error: "You cannot deactivate your own account" });
  if (target.role === "superadmin" && admin.user.role !== "superadmin") return json(403, { error: "Only superadmin can deactivate a superadmin" });

  const updatedRows = (await sql`
    UPDATE users
    SET account_status='deactivated', deactivated_at=NOW(), updated_at=NOW()
    WHERE id=${userId}
    RETURNING id, email, name, role, account_status
  `) as Array<{id:string;email:string;name:string;role:string;account_status:string}>;
  if (!updatedRows[0]) return json(404, { error: "User not found" });

  await notifyUser(updatedRows[0].id, "user_deactivated", { userId });
  await writeAuditLog({ actorUserId: admin.user.id, actorEmail: admin.user.email, action: "user_deactivated", targetUserId: updatedRows[0].id, targetEmail: updatedRows[0].email, entityType: "user", entityId: updatedRows[0].id });

  return json(200, { success: true, user: updatedRows[0] });
};
