import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdvisor } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const access = await requireAdvisor(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const rows = ["admin", "superadmin"].includes(access.user.role)
    ? await sql`
      SELECT id,name,email,phone,topic,urgency,status,created_at,message
      FROM advisor_requests
      ORDER BY created_at DESC
      LIMIT 200
    `
    : await sql`
      SELECT id,name,email,phone,topic,urgency,status,created_at,message
      FROM advisor_requests
      WHERE assigned_advisor_email = ${access.user.email}
        OR assigned_advisor_id = ${access.user.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
  return json(200, { requests: rows });
};
