import type { HandlerEvent } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser, type IdentityUser } from "./_identity";

type RoleRow = { role: string | null };

export async function requireAdmin(event: HandlerEvent): Promise<{ ok: true; identityUser: IdentityUser } | { ok: false; statusCode: number; body: { error: string } }> {
  const identityUser = getIdentityUser(event);
  if (!identityUser?.email) {
    return { ok: false, statusCode: 401, body: { error: "Unauthorized" } };
  }

  const rows = (await sql`SELECT role FROM users WHERE email = ${identityUser.email} LIMIT 1`) as RoleRow[];
  if (rows[0]?.role !== "admin") {
    return { ok: false, statusCode: 403, body: { error: "Forbidden" } };
  }

  return { ok: true, identityUser };
}
