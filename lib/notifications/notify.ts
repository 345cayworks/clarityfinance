import { randomUUID } from "crypto";
import { sql } from "../db/neon";
import { sendEmailNotification } from "./email";

type EventType = "user_pending_approval"|"user_approved"|"user_rejected"|"user_deactivated"|"advisor_request_created"|"high_value_lead_detected"|"payment_followup";
const adminEmail = () => process.env.ADMIN_NOTIFICATION_EMAIL || "info@cayworks.com";

async function logNotification(input: { userId?: string | null; recipientEmail: string; recipientPhone?: string | null; channel: string; eventType: EventType; subject: string; message: string; status: string; providerResponse?: unknown }) {
  await sql`INSERT INTO notification_logs (id,user_id,recipient_email,recipient_phone,channel,event_type,subject,message,status,provider_response) VALUES (${`not_${randomUUID()}`},${input.userId ?? null},${input.recipientEmail},${input.recipientPhone ?? null},${input.channel},${input.eventType},${input.subject},${input.message},${input.status},${JSON.stringify(input.providerResponse ?? {})}::jsonb)`;
}

export async function notifyAdmin(eventType: EventType, payload: Record<string, unknown>) { const subject = `[Admin Alert] ${eventType}`; const message = JSON.stringify(payload, null, 2); const email = adminEmail(); const sent = await sendEmailNotification({ to: email, subject, html: `<pre>${message}</pre>`, text: message }); await logNotification({ recipientEmail: email, channel: "email", eventType, subject, message, status: sent.ok ? "sent" : "failed", providerResponse: sent }); }
export async function notifyUser(userIdOrEmail: string, eventType: EventType, payload: Record<string, unknown>) { const rows = userIdOrEmail.includes("@") ? await sql`SELECT id,email,name FROM users WHERE email=${userIdOrEmail} LIMIT 1` : await sql`SELECT id,email,name FROM users WHERE id=${userIdOrEmail} LIMIT 1`; const u = (rows as Array<{id:string;email:string;name:string}>)[0]; if (!u?.email) return; const subject = `Clarity Finance Update: ${eventType.replaceAll("_", " ")}`; const message = `Hello ${u.name || "there"},\n\n${JSON.stringify(payload, null, 2)}`; const sent = await sendEmailNotification({ to: u.email, subject, html: `<p>Hello ${u.name || "there"},</p><pre>${JSON.stringify(payload, null, 2)}</pre>`, text: message }); await logNotification({ userId: u.id, recipientEmail: u.email, channel: "email", eventType, subject, message, status: sent.ok ? "sent" : "failed", providerResponse: sent }); }
