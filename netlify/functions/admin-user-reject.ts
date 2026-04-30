import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ userId?: string; reason?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  const target = await sql`SELECT id,email,name FROM users WHERE id=${body.userId} LIMIT 1` as Array<{id:string;email:string;name:string}>;
  if ((body.reason ?? '').trim()) {
    await sql`UPDATE users SET approval_status='rejected', rejection_reason=${body.reason ?? ''}, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  } else {
    await sql`UPDATE users SET approval_status='pending', rejection_reason=NULL, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  }
  if (target[0]?.id && (body.reason ?? '').trim()) await notifyUser(target[0].id, "user_rejected", { userId: body.userId, reason: body.reason ?? '' });
  return json(200, { success: true });
};
