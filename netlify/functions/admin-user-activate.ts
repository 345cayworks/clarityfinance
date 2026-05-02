import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ userId?: string }>(event) ?? {};
  const userId = (body.userId ?? "").trim();
  if (!userId) return json(400, { error: "userId is required" });

  const updatedRows = (await sql`
    UPDATE users
    SET approval_status='approved', account_status='active', activated_at=NOW(), deactivated_at=NULL, updated_at=NOW()
    WHERE id=${userId}
    RETURNING id, email, role, approval_status, account_status
  `) as Array<{id:string;email:string;role:string;approval_status:string;account_status:string}>;
  if (!updatedRows[0]) return json(404, { error: "User not found" });

  await writeAuditLog({ actorUserId: admin.user.id, actorEmail: admin.user.email, action: "user_activated", targetUserId: updatedRows[0].id, targetEmail: updatedRows[0].email, entityType: "user", entityId: updatedRows[0].id });

  return json(200, { success: true, user: updatedRows[0] });
};
