import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser?.email) return json(401, { error: "Unauthorized" });
  if (!["advisor", "admin"].includes(identityUser.role)) return json(403, { error: "Forbidden" });

  const assignedOnly = (event.queryStringParameters?.assignedOnly ?? "false") === "true";

  const requests = identityUser.role === "admin"
    ? await sql`
      SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,assigned_at,assigned_advisor_id,assigned_advisor_email,advisor_notes
      FROM advisor_requests
      ${assignedOnly ? sql`WHERE assigned_advisor_email IS NOT NULL` : sql``}
      ORDER BY created_at DESC
      LIMIT 250`
    : await sql`
      SELECT id,user_id,name,email,phone,topic,urgency,message,status,created_at,updated_at,assigned_at,assigned_advisor_id,assigned_advisor_email,advisor_notes
      FROM advisor_requests
      WHERE assigned_advisor_email = ${identityUser.email}
      ORDER BY created_at DESC
      LIMIT 250`;

  return json(200, { requests });
};
