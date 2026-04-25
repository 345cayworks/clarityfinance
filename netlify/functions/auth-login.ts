import type { Handler } from "@netlify/functions";
import { verifyPassword } from "../../lib/auth/password";
import { sessionCookie, signSessionToken } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { json, parseJsonBody } from "./_utils";

type LoginBody = { email?: string; password?: string };
type LoginUser = { id: string; email: string; name: string | null; role: string; password_hash: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseJsonBody<LoginBody>(event);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) return json(400, { error: "Email and password are required." });

  const users = await sql`
    SELECT id, email, name, role, password_hash FROM users WHERE email = ${email} LIMIT 1
  ` as LoginUser[];
  const user = users[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return json(401, { error: "We couldn't sign you in. Check your email and password and try again." });
  }

  const token = await signSessionToken({ sub: user.id, email: user.email, name: user.name, role: user.role });

  return json(200, { success: true, redirectTo: "/app/dashboard" }, { "set-cookie": sessionCookie(token) });
};
