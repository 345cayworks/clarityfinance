import type { Handler } from "@netlify/functions";
import { hashPassword } from "../../lib/auth/password";
import { hashToken } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { json, parseJsonBody } from "./_utils";

type Body = { token?: string; password?: string; confirmPassword?: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseJsonBody<Body>(event);
  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!token || password.length < 8 || password !== confirmPassword) {
    return json(400, { error: "Invalid reset request." });
  }

  const tokenHash = hashToken(token);
  const rows = await sql<{ user_id: string }[]>`
    SELECT user_id
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  const reset = rows[0];

  if (!reset) return json(400, { error: "This reset link is invalid or has expired." });

  const passwordHash = hashPassword(password);
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${reset.user_id}`;
  await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ${reset.user_id} AND used_at IS NULL`;

  return json(200, { success: true });
};
