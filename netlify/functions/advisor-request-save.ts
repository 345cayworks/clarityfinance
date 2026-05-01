import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";
import { notifyAdmin, notifyUser } from "../../lib/notifications/notify";

type UserIdRow = { id: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);
  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  const existing = await sql`SELECT id FROM users WHERE email = ${access.user.email} LIMIT 1` as UserIdRow[];
  const userId = existing[0]?.id ?? access.user.id;
  const requestId = randomId("adv");
  const urgency = String(body.urgency ?? "medium");
  await sql`INSERT INTO advisor_requests (id,user_id,name,email,phone,preferred_contact_method,topic,urgency,message,consent_to_review,source_context,prequalification_share_url,recommendation_json)
  VALUES (${requestId},${userId},${String(body.name ?? access.user.name ?? "")},${String(body.email ?? access.user.email)},${String(body.phone ?? "")},${String(body.preferredContactMethod ?? "")},${String(body.topic ?? "")},${urgency},${String(body.message ?? "")},${Boolean(body.consentToReview)},${String(body.sourceContext ?? "advisor-request")},${String(body.prequalificationShareUrl ?? "")},${JSON.stringify(body.recommendation ?? body.recommendationJson ?? {})}::jsonb)`;
  await notifyAdmin("advisor_request_created", { requestId, topic: String(body.topic ?? ""), urgency, email: String(body.email ?? access.user.email) });
  if (urgency === "high") await notifyAdmin("high_value_lead_detected", { requestId, topic: String(body.topic ?? ""), email: String(body.email ?? access.user.email) });
  await notifyUser(userId, "advisor_request_created", { requestId, status: "new" });
  return json(200, { success: true });
};
