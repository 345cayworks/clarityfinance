import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_admin";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);
  const requests = await sql`SELECT id,user_id,name,email,phone,topic,urgency,message,status,consent_to_review,created_at,updated_at FROM advisor_requests ORDER BY created_at DESC`;
  return json(200, { requests });
};
