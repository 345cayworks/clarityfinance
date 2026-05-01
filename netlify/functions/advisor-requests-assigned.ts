import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdvisor } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const access = await requireAdvisor(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const assignedOnly = (event.queryStringParameters?.assignedOnly ?? "false") === "true";

  const requests = ["admin", "superadmin"].includes(access.user.role)
    ? await sql`
      SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,assigned_at,assigned_advisor_id,assigned_advisor_email,advisor_notes
      FROM advisor_requests
      ${assignedOnly ? sql`WHERE assigned_advisor_email IS NOT NULL` : sql``}
      ORDER BY created_at DESC
      LIMIT 250`
    : await sql`
      SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,assigned_at,assigned_advisor_id,assigned_advisor_email,advisor_notes
      FROM advisor_requests
      WHERE assigned_advisor_email = ${access.user.email}
         OR assigned_advisor_id = ${access.user.id}
      ORDER BY created_at DESC
      LIMIT 250`;

  return json(200, { requests });
};
