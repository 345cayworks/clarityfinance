import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdvisor } from "./_access";
import { json } from "./_utils";

type AdvisorRequestRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  topic: string | null;
  urgency: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  assigned_at: string | null;
  assigned_advisor_id: string | null;
  assigned_advisor_email: string | null;
  advisor_notes: string | null;
};

const getAssignmentColumnAvailability = async () => {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'advisor_requests'
      AND column_name IN ('assigned_at', 'assigned_advisor_id', 'assigned_advisor_email', 'advisor_notes')
  ` as Array<{ column_name: string }>;
  const names = new Set(rows.map((row) => row.column_name));
  return {
    hasAssignedAt: names.has("assigned_at"),
    hasAssignedAdvisorId: names.has("assigned_advisor_id"),
    hasAssignedAdvisorEmail: names.has("assigned_advisor_email"),
    hasAdvisorNotes: names.has("advisor_notes")
  };
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const access = await requireAdvisor(event);
    if (!access.ok) return json(access.statusCode, access.body);

    const assignedOnly = (event.queryStringParameters?.assignedOnly ?? "false") === "true";

    const availability = await getAssignmentColumnAvailability();
    const canFilterByAssignment = availability.hasAssignedAdvisorEmail || availability.hasAssignedAdvisorId;
    const requests: AdvisorRequestRow[] = ["admin", "superadmin"].includes(access.user.role)
      ? await sql`
        SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,
               ${availability.hasAssignedAt ? sql`assigned_at` : sql`NULL::timestamptz`} AS assigned_at,
               ${availability.hasAssignedAdvisorId ? sql`assigned_advisor_id` : sql`NULL::text`} AS assigned_advisor_id,
               ${availability.hasAssignedAdvisorEmail ? sql`assigned_advisor_email` : sql`NULL::text`} AS assigned_advisor_email,
               ${availability.hasAdvisorNotes ? sql`advisor_notes` : sql`NULL::text`} AS advisor_notes
        FROM advisor_requests
        ${
          assignedOnly && canFilterByAssignment
            ? sql`WHERE ${availability.hasAssignedAdvisorEmail ? sql`assigned_advisor_email IS NOT NULL` : sql`FALSE`} OR ${availability.hasAssignedAdvisorId ? sql`assigned_advisor_id IS NOT NULL` : sql`FALSE`}`
            : sql``
        }
        ORDER BY created_at DESC
        LIMIT 250` as AdvisorRequestRow[]
      : canFilterByAssignment
        ? await sql`
          SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,
                 ${availability.hasAssignedAt ? sql`assigned_at` : sql`NULL::timestamptz`} AS assigned_at,
                 ${availability.hasAssignedAdvisorId ? sql`assigned_advisor_id` : sql`NULL::text`} AS assigned_advisor_id,
                 ${availability.hasAssignedAdvisorEmail ? sql`assigned_advisor_email` : sql`NULL::text`} AS assigned_advisor_email,
                 ${availability.hasAdvisorNotes ? sql`advisor_notes` : sql`NULL::text`} AS advisor_notes
          FROM advisor_requests
          WHERE
            ${availability.hasAssignedAdvisorEmail ? sql`assigned_advisor_email = ${access.user.email}` : sql`FALSE`}
            OR ${availability.hasAssignedAdvisorId ? sql`assigned_advisor_id = ${access.user.id}` : sql`FALSE`}
          ORDER BY created_at DESC
          LIMIT 250` as AdvisorRequestRow[]
        : [];

    return json(200, { requests: requests ?? [] });
  } catch (err) {
    console.error("[advisor-requests-assigned] Failed to load advisor requests", {
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      method: event.httpMethod,
      query: event.queryStringParameters ?? null
    });
    return json(500, { error: "Failed to load assigned requests" });
  }
};
