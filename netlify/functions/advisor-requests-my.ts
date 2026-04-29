import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });
  const rows = await sql`SELECT id,topic,urgency,status,created_at FROM advisor_requests WHERE email = ${identityUser.email} ORDER BY created_at DESC`;
  return json(200, { requests: rows });
};
