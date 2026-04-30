import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);
  const rows = await sql`SELECT id,topic,urgency,status,created_at FROM advisor_requests WHERE email = ${access.user.email} ORDER BY created_at DESC`;
  return json(200, { requests: rows });
};
