import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_admin";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

const allowed = new Set(["reviewing", "contacted", "closed"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ id?: string; status?: string }>(event) ?? {};
  if (!body.id || !body.status || !allowed.has(body.status)) return json(400, { error: "Valid id and status required" });

  const req = await sql`SELECT user_id,email FROM advisor_requests WHERE id=${body.id} LIMIT 1` as Array<{user_id:string;email:string}>;
  await sql`UPDATE advisor_requests SET status=${body.status}, updated_at=NOW() WHERE id=${body.id}`;
  if (req[0]?.user_id) await notifyUser(req[0].user_id, "payment_followup", { requestId: body.id, status: body.status });
  return json(200, { success: true });
};
