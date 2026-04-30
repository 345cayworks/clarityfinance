import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ userId?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  const target = await sql`SELECT id,email,name FROM users WHERE id=${body.userId} LIMIT 1` as Array<{id:string;email:string;name:string}>;
  await sql`UPDATE users SET approval_status='approved', approved_at=NOW(), approved_by=${admin.user.email}, rejection_reason=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  if (target[0]?.id) await notifyUser(target[0].id, "user_approved", { userId: body.userId });
  return json(200, { success: true });
};
