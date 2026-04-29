import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { requireAdmin } from "./_admin";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });
  if (!(await requireAdmin(identityUser))) return json(403, { error: "Forbidden" });

  const users = await sql`SELECT id, name, email, phone, role, approval_status, created_at, approved_at, approved_by, rejection_reason FROM users ORDER BY created_at DESC`;
  return json(200, { users });
};
