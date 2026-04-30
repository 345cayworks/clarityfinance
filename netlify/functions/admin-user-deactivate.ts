import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { ADMIN_EMAIL } from "./_admin";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ userId?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  const targetEmail = (await sql`SELECT email FROM users WHERE id = ${body.userId} LIMIT 1`) as Array<{ email: string }>;
  if (targetEmail[0]?.email?.toLowerCase() === ADMIN_EMAIL) {
    return json(403, { error: "Primary admin cannot be deactivated" });
  }

  const target = await sql`SELECT id,email,name FROM users WHERE id=${body.userId} LIMIT 1` as Array<{id:string;email:string;name:string}>;
  await sql`UPDATE users SET account_status='deactivated', deactivated_at=NOW(), updated_at=NOW() WHERE id=${body.userId}`;
  if (target[0]?.id) await notifyUser(target[0].id, "user_deactivated", { userId: body.userId });
  return json(200, { success: true });
};
