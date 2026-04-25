import crypto from "crypto";
import type { Handler } from "@netlify/functions";
import { randomId, hashToken } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { sendPasswordResetEmail } from "../../lib/email/send-password-reset";
import { json, parseJsonBody } from "./_utils";

type Body = { email?: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const body = parseJsonBody<Body>(event);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (email) {
    const users = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    const user = users[0];

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
      const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

      await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ${user.id} AND used_at IS NULL`;
      await sql`
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
        VALUES (${randomId("prt")}, ${user.id}, ${tokenHash}, ${expiresAt})
      `;

      try {
        await sendPasswordResetEmail({ to: email, resetLink });
      } catch (error) {
        console.error("Password reset email send failed", error);
      }
    }
  }

  return json(200, { success: true, message: "If the account exists, reset instructions have been sent." });
};
