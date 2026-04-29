import type { HandlerEvent } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser, type IdentityUser } from "./_identity";

type RoleRow = { role: string | null };
export const ADMIN_EMAIL = "info@cayworks.com";

export async function requireAdmin(event: HandlerEvent): Promise<{ ok: true; identityUser: IdentityUser } | { ok: false; statusCode: number; body: { error: string } }> {
  const identityUser = getIdentityUser(event);
  if (!identityUser?.email) {
    return { ok: false, statusCode: 401, body: { error: "Unauthorized" } };
  }

  const normalizedEmail = identityUser.email.toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) {
    await sql`
      UPDATE users
      SET role = 'admin',
          approval_status = 'approved',
          account_status = 'active',
          approved_at = NOW(),
          updated_at = NOW()
      WHERE email = ${ADMIN_EMAIL}
        AND (role IS DISTINCT FROM 'admin' OR approval_status IS DISTINCT FROM 'approved' OR account_status IS DISTINCT FROM 'active')
    `;
    return { ok: true, identityUser };
  }

  const rows = (await sql`SELECT role FROM users WHERE email = ${normalizedEmail} LIMIT 1`) as RoleRow[];
  if (rows[0]?.role !== "admin") {
    return { ok: false, statusCode: 403, body: { error: "Forbidden" } };
  }

  return { ok: true, identityUser };
}
