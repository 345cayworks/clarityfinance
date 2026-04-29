import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_admin";
import { json, parseJsonBody } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ userId?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  await sql`UPDATE users SET approval_status='approved', account_status='active', activated_at=NOW(), deactivated_at=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  return json(200, { success: true });
};
