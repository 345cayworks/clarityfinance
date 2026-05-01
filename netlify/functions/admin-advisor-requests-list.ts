import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const requests = await sql`
    SELECT ar.id,ar.user_id,ar.name,ar.email,ar.phone,ar.topic,ar.urgency,ar.message,ar.status,ar.consent_to_review,ar.created_at,ar.updated_at,
           ar.assigned_advisor_id,ar.assigned_advisor_email,ar.assigned_at,ar.assigned_by,u.name AS assigned_advisor_name
    FROM advisor_requests ar
    LEFT JOIN users u ON u.id = ar.assigned_advisor_id
    ORDER BY ar.created_at DESC
  `;
  return json(200, { requests });
};
