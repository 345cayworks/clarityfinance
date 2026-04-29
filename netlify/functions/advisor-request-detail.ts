import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser?.email) return json(401, { error: "Unauthorized" });
  if (!["advisor", "admin"].includes(identityUser.role)) return json(403, { error: "Forbidden" });

  const requestId = event.queryStringParameters?.requestId;
  if (!requestId) return json(400, { error: "requestId required" });

  const where = identityUser.role === "admin" ? sql`id=${requestId}` : sql`id=${requestId} AND assigned_advisor_email=${identityUser.email}`;
  const rows = await sql`SELECT * FROM advisor_requests WHERE ${where} LIMIT 1` as Array<Record<string, unknown>>;
  const request = rows[0];
  if (!request) return json(404, { error: "Not found" });

  return json(200, {
    request,
    userProfileSummary: null,
    prequalificationSummary: request.recommendation_json ?? null,
    loanReadinessScore: null
  });
};
