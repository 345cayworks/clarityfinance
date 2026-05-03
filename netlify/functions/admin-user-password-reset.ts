import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
};

function isValidBaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getBaseUrl(event: Parameters<Handler>[0]) {
  const forwardedProto = event.headers["x-forwarded-proto"] ?? event.headers["X-Forwarded-Proto"];
  const host = event.headers.host ?? event.headers.Host;
  if (typeof host === "string" && host.trim()) {
    const proto = typeof forwardedProto === "string" && forwardedProto.trim() ? forwardedProto.split(",")[0] : "https";
    return `${proto}://${host}`;
  }
  if (isValidBaseUrl(process.env.APP_URL)) return process.env.APP_URL;
  if (isValidBaseUrl(process.env.URL)) return process.env.URL;
  if (isValidBaseUrl(process.env.DEPLOY_URL)) return process.env.DEPLOY_URL;
  return "https://clarityfinance.cayworks.com";
}

async function sendRecoveryEmail(event: Parameters<Handler>[0], email: string) {
  const baseUrl = getBaseUrl(event);
  const response = await fetch(`${baseUrl}/.netlify/identity/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("admin-user-password-reset identity recover failed", {
      status: response.status,
      statusText: response.statusText,
      body: text.slice(0, 160)
    });
    throw new Error("Identity recovery request failed");
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ userId?: string; email?: string }>(event) ?? {};
  const userId = (body.userId ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!userId && !email) return json(400, { error: "User id or email is required." });
  if (email && !emailPattern.test(email)) return json(400, { error: "Valid email is required." });

  const rows = (userId
    ? await sql`SELECT id, email, name, role FROM users WHERE id = ${userId} LIMIT 1`
    : await sql`SELECT id, email, name, role FROM users WHERE email = ${email} LIMIT 1`) as UserRow[];

  const target = rows[0];
  if (!target) return json(404, { error: "User not found." });

  const actorIsSuperadmin = admin.user.role === "superadmin";
  if ((target.role === "admin" || target.role === "superadmin") && !actorIsSuperadmin) {
    return json(403, { error: "Only superadmin can reset an admin password." });
  }

  try {
    await sendRecoveryEmail(event, target.email);

    await writeAuditLog({
      actorUserId: admin.user.id,
      actorEmail: admin.user.email,
      action: "user_password_reset_requested",
      targetUserId: target.id,
      targetEmail: target.email,
      entityType: "user",
      entityId: target.id,
      metadata: { method: "netlify_identity_recovery_email" }
    });
  } catch (error) {
    console.error("admin-user-password-reset failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return json(500, { error: "Failed to send password reset email." });
  }

  return json(200, {
    success: true,
    message: `Password reset email sent to ${target.email}. The user can set a new password using the recovery link.`
  });
};
