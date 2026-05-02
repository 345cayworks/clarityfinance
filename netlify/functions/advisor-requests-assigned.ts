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
};

const isUndefinedColumnError = (err: unknown): boolean =>
  Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42703");

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const access = await requireAdvisor(event);
    if (!access.ok) return json(access.statusCode, access.body);

    const assignedOnly = (event.queryStringParameters?.assignedOnly ?? "false") === "true";

    let requests: AdvisorRequestRow[] = [];
    try {
      requests = ["admin", "superadmin"].includes(access.user.role)
        ? await sql`
          SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,assigned_at,assigned_advisor_id,assigned_advisor_email
          FROM advisor_requests
          ${assignedOnly ? sql`WHERE assigned_advisor_email IS NOT NULL` : sql``}
          ORDER BY created_at DESC
          LIMIT 250` as AdvisorRequestRow[]
        : await sql`
          SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,assigned_at,assigned_advisor_id,assigned_advisor_email
          FROM advisor_requests
          WHERE assigned_advisor_email = ${access.user.email}
             OR assigned_advisor_id = ${access.user.id}
          ORDER BY created_at DESC
          LIMIT 250` as AdvisorRequestRow[];
    } catch (err) {
      if (!isUndefinedColumnError(err)) throw err;

      requests = ["admin", "superadmin"].includes(access.user.role)
        ? await sql`
          SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,
                 NULL::timestamptz AS assigned_at,
                 NULL::text AS assigned_advisor_id,
                 NULL::text AS assigned_advisor_email
          FROM advisor_requests
          ORDER BY created_at DESC
          LIMIT 250` as AdvisorRequestRow[]
        : [];
    }

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
