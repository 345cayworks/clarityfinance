import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";
import { notifyAdmin, notifyUser } from "../../lib/notifications/notify";
import { writeAuditLog } from "./_audit";

type UserIdRow = { id: string };
const CONSENT_TEXT = "I authorize Clarity Finance to share the selected readiness summary, financial snapshot, and supporting information with the assigned advisor or selected financial institution for review. I understand this is not a loan approval or investment recommendation.";
const CONSENT_VERSION = "data-sharing-consent-v1";

async function ensureConsentStorage() {
  await sql`
    CREATE TABLE IF NOT EXISTS data_sharing_consents (
      id text PRIMARY KEY,
      user_id text,
      recipient_type text,
      recipient_name text,
      source_context text,
      artifact_id text,
      consent_text text,
      consent_version text,
      shared_scope_json jsonb DEFAULT '{}'::jsonb,
      created_at timestamp DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_data_sharing_consents_user_id ON data_sharing_consents(user_id)`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);
  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  if (body.consentToReview !== true) {
    return json(400, { error: "Consent is required before sharing financial information for advisor or bank review." });
  }
  const existing = await sql`SELECT id FROM users WHERE email = ${access.user.email} LIMIT 1` as UserIdRow[];
  const userId = existing[0]?.id ?? access.user.id;
  const requestId = randomId("adv");
  const urgency = String(body.urgency ?? "medium");
  const consentMetadata = (typeof body.consentMetadata === "object" && body.consentMetadata !== null ? body.consentMetadata : {}) as Record<string, unknown>;
  const consentedAt = new Date().toISOString();
  const consent = {
    recipientType: String(consentMetadata.recipientType ?? "advisor"),
    recipientName: String(consentMetadata.recipientName ?? "Assigned advisor"),
    sourceContext: String(consentMetadata.sourceContext ?? body.sourceContext ?? "advisor-request"),
    artifactId: consentMetadata.artifactId === null || consentMetadata.artifactId === undefined ? null : String(consentMetadata.artifactId),
    consentText: CONSENT_TEXT,
    consentVersion: String(consentMetadata.consentVersion ?? CONSENT_VERSION),
    consentedAt,
    sharedScope: consentMetadata.sharedScope ?? { financialSnapshot: true, supportingInformation: true }
  };
  const recommendationSource = typeof body.recommendation === "object" && body.recommendation !== null
    ? body.recommendation
    : typeof body.recommendationJson === "object" && body.recommendationJson !== null
      ? body.recommendationJson
      : {};
  const recommendation = {
    ...(recommendationSource as Record<string, unknown>),
    consent
  };
  await sql`INSERT INTO advisor_requests (id,user_id,name,email,phone,preferred_contact_method,topic,urgency,message,consent_to_review,source_context,prequalification_share_url,recommendation_json)
  VALUES (${requestId},${userId},${String(body.name ?? access.user.name ?? "")},${String(body.email ?? access.user.email)},${String(body.phone ?? "")},${String(body.preferredContactMethod ?? "")},${String(body.topic ?? "")},${urgency},${String(body.message ?? "")},${true},${String(body.sourceContext ?? "advisor-request")},${String(body.prequalificationShareUrl ?? "")},${JSON.stringify(recommendation)}::jsonb)`;
  await ensureConsentStorage();
  await sql`
    INSERT INTO data_sharing_consents (id,user_id,recipient_type,recipient_name,source_context,artifact_id,consent_text,consent_version,shared_scope_json,created_at)
    VALUES (${randomId("consent")},${userId},${consent.recipientType},${consent.recipientName},${consent.sourceContext},${consent.artifactId},${consent.consentText},${consent.consentVersion},${JSON.stringify(consent.sharedScope)}::jsonb,${consentedAt}::timestamp)
  `;
  await writeAuditLog({
    actorUserId: userId,
    actorEmail: access.user.email,
    actorRole: access.user.role,
    action: "advisor_request_created_with_consent",
    targetUserId: userId,
    targetEmail: access.user.email,
    entityType: "advisor_request",
    entityId: requestId,
    sourceFunction: "advisor-request-save",
    metadata: {
      recipientType: consent.recipientType,
      recipientName: consent.recipientName,
      sourceContext: consent.sourceContext,
      artifactAttached: Boolean(consent.artifactId),
      consentVersion: consent.consentVersion
    }
  });
  await notifyAdmin("advisor_request_created", { requestId, topic: String(body.topic ?? ""), urgency, email: String(body.email ?? access.user.email) });
  if (urgency === "high") await notifyAdmin("high_value_lead_detected", { requestId, topic: String(body.topic ?? ""), email: String(body.email ?? access.user.email) });
  await notifyUser(userId, "advisor_request_created", { requestId, status: "new" });
  return json(200, { success: true });
};
