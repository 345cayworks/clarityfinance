import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAssignedAdvisorOrAdmin } from "./_access";
import { json } from "./_utils";

const REQUEST_FIELDS = [
  "id", "user_id", "name", "email", "phone", "topic", "urgency", "message",
  "prequalification_share_url", "source_context", "recommendation_json", "assigned_advisor_email",
  "assigned_advisor_id", "assigned_at", "assigned_by", "advisor_notes", "status", "created_at",
  "updated_at", "loan_readiness_application_id", "loan_readiness_report_id", "artifact_type"
] as const;

const ENSURE_ADVISOR_COLUMNS_SQL = sql`
  ALTER TABLE advisor_requests
  ADD COLUMN IF NOT EXISTS advisor_notes text,
  ADD COLUMN IF NOT EXISTS advisor_private_notes text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS advisor_last_updated_at timestamptz
`;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    await ENSURE_ADVISOR_COLUMNS_SQL;
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
    return json(200, { request, userProfileSummary: null, prequalificationSummary: request.recommendation_json ?? null, loanReadinessScore: null });
  } catch (err) {
    console.error("[advisor-request-detail] Failed to load advisor request detail", {
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      method: event.httpMethod,
      query: event.queryStringParameters ?? null
    });
    return json(500, { error: "Failed to load request detail" });
  }
};
