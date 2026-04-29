import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { getUserApprovalStatus } from "./_approval";
import { json, parseJsonBody, randomId } from "./_utils";

type UserIdRow = { id: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  const approval = await getUserApprovalStatus(identityUser);
  if (!approval.approved) return json(403, { error: "Account pending approval." });
  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  const existing = await sql`SELECT id FROM users WHERE email = ${identityUser.email} LIMIT 1` as UserIdRow[];
  const userId = existing[0]?.id ?? identityUser.id;
  await sql`INSERT INTO advisor_requests (id,user_id,name,email,phone,preferred_contact_method,topic,urgency,message,consent_to_review,source_context,recommendation_json)
  VALUES (${randomId("adv")},${userId},${String(body.name ?? identityUser.name ?? "")},${String(body.email ?? identityUser.email)},${String(body.phone ?? "")},${String(body.preferredContactMethod ?? "")},${String(body.topic ?? "")},${String(body.urgency ?? "medium")},${String(body.message ?? "")},${Boolean(body.consentToReview)},${String(body.sourceContext ?? "")},${JSON.stringify(body.recommendation ?? {})}::jsonb)`;
  return json(200, { success: true });
};
