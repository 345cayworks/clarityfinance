import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumUser } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, randomId } from "./_utils";
const REPORT_VERSION = "Clarity Report v1.0";
const REPORT_DISCLAIMER = "Based on user-entered information and planning assumptions. Not a loan approval or credit decision. Final approval is subject to lender underwriting.";

async function ensureReportMetadataColumns() {
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_version text`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS generated_at timestamp`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS assumptions_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS disclaimer_text text`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_context text`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS based_on_user_entered_data boolean DEFAULT true`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requirePremiumUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const rows = await sql`SELECT * FROM loan_readiness_applications WHERE user_id = ${access.user.id} ORDER BY updated_at DESC LIMIT 1` as Record<string, unknown>[];
  const latest = rows[0];
  if (!latest) return json(200, { success: true, report: { title: "Loan Readiness Snapshot", reportVersion: REPORT_VERSION, generatedAt: new Date().toISOString(), summary: "No saved loan readiness application found yet.", disclaimerText: REPORT_DISCLAIMER } });

  const reportId = randomId("rpt");
  const generatedAt = new Date().toISOString();
  const assumptions = { source: "saved_loan_readiness_application", userEnteredData: true, basedOnUserEnteredData: true, lenderVerificationRequired: true };
  const snapshot = { generatedAt, reportVersion: REPORT_VERSION, type: "loan_readiness", application: latest, basedOnUserEnteredData: true, assumptions, disclaimerText: REPORT_DISCLAIMER, sourceContext: "loan_readiness" };
  await ensureReportMetadataColumns();
  await sql`
    INSERT INTO reports (id, user_id, title, report_json, report_version, generated_at, assumptions_json, disclaimer_text, source_context, based_on_user_entered_data)
    VALUES (${reportId}, ${access.user.id}, 'Loan Readiness Snapshot', ${JSON.stringify(snapshot)}::jsonb, ${REPORT_VERSION}, ${generatedAt}::timestamp, ${JSON.stringify(assumptions)}::jsonb, ${REPORT_DISCLAIMER}, ${"loan_readiness"}, ${true})
  `;
  await writeAuditLog({
    actorUserId: access.user.id,
    actorEmail: access.user.email,
    actorRole: access.user.role,
    action: "loan_readiness_report_created",
    targetUserId: access.user.id,
    targetEmail: access.user.email,
    entityType: "report",
    entityId: reportId,
    sourceFunction: "loan-readiness-report-create",
    metadata: { reportType: "loan_readiness", reportVersion: REPORT_VERSION, sourceContext: "loan_readiness" }
  });
  return json(200, { success: true, id: reportId });
};
