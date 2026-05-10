import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody, randomId } from "./_utils";

type ProfileRow = Record<string, unknown>;
type IncomeSourceRow = Record<string, unknown>;
type ExpenseProfileRow = Record<string, unknown>;
type DebtRow = Record<string, unknown>;
type HousingProfileRow = Record<string, unknown>;
type SavingsProfileRow = Record<string, unknown>;
type GoalRow = Record<string, unknown>;
type RentRoomRow = Record<string, unknown>;

type ReportCreateBody = {
  reportType?: string;
};
const REPORT_VERSION = "Clarity Report v1.0";
const REPORT_DISCLAIMER = "Based on user-entered information and planning assumptions. Not a loan approval, not a credit decision, and not financial or investment advice. Final lender approval is subject to lender underwriting.";

const reportTitles: Record<string, string> = {
  financial_snapshot: "Financial Snapshot",
  expense_report: "Expense Report",
  bank_loan_readiness: "Bank Loan Readiness Report",
  loan_document_checklist: "Loan Document Checklist",
  rent_a_room_scenario: "Rent a Room Scenario Report",
  savings_cash_flow: "Savings & Cash Flow Report",
  debt_liability: "Debt & Liability Report",
  housing_equity: "Housing & Equity Report"
};

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
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<ReportCreateBody>(event) ?? {};
  const reportType = String(body.reportType ?? "financial_snapshot");
  const title = reportTitles[reportType] ?? "Financial Snapshot";

  const [profile, incomeSources, expenseProfile, debts, housingProfile, savingsProfile, goals, rentRoomScenario] = await Promise.all([
    sql`SELECT * FROM profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<ProfileRow[]>,
    sql`SELECT * FROM income_sources WHERE user_id = ${access.user.id} ORDER BY created_at DESC` as Promise<IncomeSourceRow[]>,
    sql`SELECT * FROM expense_profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<ExpenseProfileRow[]>,
    sql`SELECT * FROM debts WHERE user_id = ${access.user.id} ORDER BY created_at DESC` as Promise<DebtRow[]>,
    sql`SELECT * FROM housing_profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<HousingProfileRow[]>,
    sql`SELECT * FROM savings_profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<SavingsProfileRow[]>,
    sql`SELECT * FROM goals WHERE user_id = ${access.user.id} LIMIT 1` as Promise<GoalRow[]>,
    sql`SELECT * FROM rent_room_scenarios WHERE user_id = ${access.user.id} ORDER BY updated_at DESC, created_at DESC LIMIT 1` as Promise<RentRoomRow[]>
  ]);

  const reportId = randomId("rpt");
  const generatedAt = new Date().toISOString();
  const assumptions = {
    source: "user_entered_data",
    basedOnUserEnteredData: true,
    profileSnapshot: true,
    missingFieldsShownAsMissingData: true,
    lenderVerificationRequired: true,
    rentRoomSecurityDepositExcludedFromProfit: true
  };

  await ensureReportMetadataColumns();
  await sql`
    INSERT INTO reports (id, user_id, title, report_json, report_version, generated_at, assumptions_json, disclaimer_text, source_context, based_on_user_entered_data)
    VALUES (
      ${reportId},
      ${access.user.id},
      ${title},
      ${JSON.stringify({
        reportType,
        title,
        reportVersion: REPORT_VERSION,
        profile: profile[0] ?? null,
        incomeSources,
        expenseProfile: expenseProfile[0] ?? null,
        debts,
        housingProfile: housingProfile[0] ?? null,
        savingsProfile: savingsProfile[0] ?? null,
        goals: goals[0] ?? null,
        rentRoomScenario: rentRoomScenario[0] ?? null,
        generatedAt,
        basedOnUserEnteredData: true,
        assumptions,
        disclaimerText: REPORT_DISCLAIMER,
        sourceContext: "reports"
      })}::jsonb,
      ${REPORT_VERSION},
      ${generatedAt}::timestamp,
      ${JSON.stringify(assumptions)}::jsonb,
      ${REPORT_DISCLAIMER},
      ${"reports"},
      ${true}
    )
  `;
  await writeAuditLog({
    actorUserId: access.user.id,
    actorEmail: access.user.email,
    actorRole: access.user.role,
    action: "report_created",
    targetUserId: access.user.id,
    targetEmail: access.user.email,
    entityType: "report",
    entityId: reportId,
    sourceFunction: "report-create",
    metadata: { reportType, reportVersion: REPORT_VERSION, sourceContext: "reports" }
  });

  return json(200, { success: true, reportId, reportType, title });
};
