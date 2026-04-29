import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { requireAdmin } from "./_admin";
import { json, parseJsonBody } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });
  if (!(await requireAdmin(identityUser))) return json(403, { error: "Forbidden" });
  const body = parseJsonBody<{ userId?: string; reason?: string }>(event) ?? {};
  if (!body.userId) return json(400, { error: "userId is required" });

  if ((body.reason ?? '').trim()) {
    await sql`UPDATE users SET approval_status='rejected', rejection_reason=${body.reason ?? ''}, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  } else {
    await sql`UPDATE users SET approval_status='pending', rejection_reason=NULL, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=${body.userId}`;
  }
  return json(200, { success: true });
};
