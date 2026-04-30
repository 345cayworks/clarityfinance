import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const advisors = await sql`
    SELECT id, name, email, role
    FROM users
    WHERE role IN ('advisor', 'admin')
      AND account_status = 'active'
      AND approval_status = 'approved'
    ORDER BY name ASC NULLS LAST, email ASC
  `;

  return json(200, { advisors });
};
