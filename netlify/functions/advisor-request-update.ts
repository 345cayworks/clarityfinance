import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAssignedAdvisorOrAdmin } from "./_access";
import { json, parseJsonBody } from "./_utils";

const allowed = new Set(["reviewing", "contacted", "closed"]);

export const handler: Handler = async (event) => {
  const body = parseJsonBody<{ requestId?: string; status?: string; advisorNotes?: string }>(event) ?? {};
  if (!body.requestId || !body.status || !allowed.has(body.status)) return json(400, { error: "Invalid payload" });

  const targetRows = await sql`SELECT assigned_advisor_email FROM advisor_requests WHERE id = ${body.requestId} LIMIT 1` as Array<{ assigned_advisor_email: string | null }>;
  if (!targetRows[0]) return json(404, { error: "Not found" });
  const access = await requireAssignedAdvisorOrAdmin(event, targetRows[0].assigned_advisor_email);
  if (!access.ok) return json(access.statusCode, access.body);

  await sql`UPDATE advisor_requests SET status=${body.status}, advisor_notes=${body.advisorNotes ?? null}, advisor_last_updated_at=NOW(), updated_at=NOW() WHERE id=${body.requestId}`;
  return json(200, { ok: true });
};
