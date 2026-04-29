import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });
  if (!identityUser.role || (identityUser.role !== "admin" && identityUser.role !== "advisor")) return json(403, { error: "Forbidden" });
  const rows = await sql`SELECT id,name,email,phone,topic,urgency,status,created_at,message FROM advisor_requests ORDER BY created_at DESC LIMIT 200`;
  return json(200, { requests: rows });
};
