import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAssignedAdvisorOrAdmin } from "./_access";
import { json } from "./_utils";

const REQUEST_FIELDS = [
  "id",
  "user_id",
  "name",
  "email",
  "phone",
  "topic",
  "urgency",
  "message",
  "prequalification_share_url",
  "source_context",
  "recommendation_json",
  "assigned_advisor_email",
  "assigned_advisor_id",
  "assigned_at",
  "assigned_by",
  "advisor_notes",
  "status",
  "created_at",
  "updated_at",
  "loan_readiness_application_id",
  "loan_readiness_report_id",
  "artifact_type"
] as const;

export const handler: Handler = async (event) => {
  const requestId = event.queryStringParameters?.requestId;
  if (!requestId) return json(400, { error: "requestId required" });

  const rows = await sql`SELECT * FROM advisor_requests WHERE id=${requestId} LIMIT 1` as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return json(404, { error: "Not found" });

  const access = await requireAssignedAdvisorOrAdmin(event, {
    assignedAdvisorEmail: (row.assigned_advisor_email as string | null | undefined) ?? null,
    assignedAdvisorId: (row.assigned_advisor_id as string | null | undefined) ?? null
  });
  if (!access.ok) return json(access.statusCode, access.body);

  const request = Object.fromEntries(REQUEST_FIELDS.map((field) => [field, row[field] ?? null]));

  return json(200, {
    request,
    userProfileSummary: null,
    prequalificationSummary: request.recommendation_json ?? null,
    loanReadinessScore: null
  });
};
