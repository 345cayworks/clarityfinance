import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_admin";
import { json, parseJsonBody } from "./_utils";

const allowed = new Set(["reviewing", "contacted", "closed"]);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const body = parseJsonBody<{ id?: string; status?: string }>(event) ?? {};
  if (!body.id || !body.status || !allowed.has(body.status)) return json(400, { error: "Valid id and status required" });

  await sql`UPDATE advisor_requests SET status=${body.status}, updated_at=NOW() WHERE id=${body.id}`;
  return json(200, { success: true });
};
