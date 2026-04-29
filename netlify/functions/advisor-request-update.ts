import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json, parseJsonBody } from "./_utils";

const allowed = new Set(["reviewing", "contacted", "closed"]);

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser?.email) return json(401, { error: "Unauthorized" });
  if (!["advisor", "admin"].includes(identityUser.role)) return json(403, { error: "Forbidden" });

  const body = parseJsonBody<{ requestId?: string; status?: string; advisorNotes?: string }>(event) ?? {};
  if (!body.requestId || !body.status || !allowed.has(body.status)) return json(400, { error: "Invalid payload" });

  if (identityUser.role === "advisor") {
    const mine = await sql`SELECT id FROM advisor_requests WHERE id = ${body.requestId} AND assigned_advisor_email = ${identityUser.email} LIMIT 1` as Array<{id:string}>;
    if (!mine[0]?.id) return json(403, { error: "Forbidden" });
  }

  await sql`UPDATE advisor_requests SET status=${body.status}, advisor_notes=${body.advisorNotes ?? null}, advisor_last_updated_at=NOW(), updated_at=NOW() WHERE id=${body.requestId}`;
  return json(200, { ok: true });
};
