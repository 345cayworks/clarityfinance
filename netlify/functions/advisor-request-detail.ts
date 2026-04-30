import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAssignedAdvisorOrAdmin } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const requestId = event.queryStringParameters?.requestId;
  if (!requestId) return json(400, { error: "requestId required" });

  const rows = await sql`SELECT * FROM advisor_requests WHERE id=${requestId} LIMIT 1` as Array<Record<string, unknown>>;
  const request = rows[0];
  if (!request) return json(404, { error: "Not found" });
  const access = await requireAssignedAdvisorOrAdmin(event, (request.assigned_advisor_email as string | null | undefined) ?? null);
  if (!access.ok) return json(access.statusCode, access.body);

  return json(200, {
    request,
    userProfileSummary: null,
    prequalificationSummary: request.recommendation_json ?? null,
    loanReadinessScore: null
  });
};
