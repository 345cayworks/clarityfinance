import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser?.email) return json(401, { error: "Unauthorized" });
  await sql`UPDATE users SET last_active_at=NOW(), updated_at=NOW() WHERE email=${identityUser.email}`;
  return json(200, { success: true });
};
