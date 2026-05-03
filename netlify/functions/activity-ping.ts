import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAuth } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (!auth.ok) return json(auth.statusCode, auth.body);
  await sql`UPDATE users SET last_active_at=NOW(), updated_at=NOW() WHERE email=${auth.user.email}`;
  return json(200, { success: true });
};
