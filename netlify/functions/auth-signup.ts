import type { Handler } from "@netlify/functions";
import { hashPassword } from "../../lib/auth/password";
import { randomId, sessionCookie, signSessionToken } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { json, parseJsonBody } from "./_utils";

type SignupBody = { name?: string; email?: string; password?: string; confirmPassword?: string };
type ExistingUser = { id: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseJsonBody<SignupBody>(event);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!name || !email || password.length < 8 || password !== confirmPassword) {
    return json(400, { error: "Please provide a valid name, email, and matching 8+ char password." });
  }

  const existing = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  ` as ExistingUser[];

  if (existing.length > 0) {
    return json(409, { error: "An account already exists for this email." });
  }

  const userId = randomId("usr");
  await sql`
    INSERT INTO users (id, email, name, password_hash, role)
    VALUES (${userId}, ${email}, ${name}, ${hashPassword(password)}, 'user')
  `;

  const token = await signSessionToken({ sub: userId, email, name, role: "user" });

  return json(
    200,
    { success: true, redirectTo: "/app/onboarding" },
    { "set-cookie": sessionCookie(token) }
  );
};
