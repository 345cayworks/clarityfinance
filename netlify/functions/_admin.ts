import { sql } from "../../lib/db/neon";
import type { IdentityUser } from "./_identity";
import { isIdentityAdmin } from "./_approval";

type RoleRow = { role: string | null };

export async function requireAdmin(identityUser: IdentityUser): Promise<boolean> {
  if (isIdentityAdmin(identityUser.role)) return true;
  const rows = (await sql`SELECT role FROM users WHERE email = ${identityUser.email} LIMIT 1`) as RoleRow[];
  return rows[0]?.role === "admin";
}
