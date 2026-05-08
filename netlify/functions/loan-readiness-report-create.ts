import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumUser } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, randomId } from "./_utils";
const REPORT_VERSION = "Clarity Report v1.0";
const REPORT_DISCLAIMER = "Based on user-entered information and planning assumptions. Not a loan approval or credit decision. Final approval is subject to lender underwriting.";
const SAVINGS_RUNWAY_ASSUMPTION = "Savings runway estimates how long liquid savings could cover housing and living expenses. Debt payments are not included in this runway estimate.";

async function ensureReportMetadataColumns() {
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_version text`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS generated_at timestamp`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS assumptions_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS disclaimer_text text`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_context text`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS based_on_user_entered_data boolean DEFAULT true`;
}

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

function getApplicationJson(row: Record<string, unknown>) {
  const value = row.application_json;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getCanonicalSummary(row: Record<string, unknown>) {
  const application = getApplicationJson(row);
  const canonical = application.canonicalFields && typeof application.canonicalFields === "object" && !Array.isArray(application.canonicalFields)
    ? application.canonicalFields as Record<string, unknown>
    : {};
  const readinessProfile = application.readinessProfile && typeof application.readinessProfile === "object" && !Array.isArray(application.readinessProfile)
    ? application.readinessProfile as Record<string, unknown>
    : {};
  const financials = readinessProfile.financials && typeof readinessProfile.financials === "object" && !Array.isArray(readinessProfile.financials)
    ? readinessProfile.financials as Record<string, unknown>
    : {};
  const ratios = readinessProfile.ratios && typeof readinessProfile.ratios === "object" && !Array.isArray(readinessProfile.ratios)
    ? readinessProfile.ratios as Record<string, unknown>
    : {};
  const loan = readinessProfile.loan && typeof readinessProfile.loan === "object" && !Array.isArray(readinessProfile.loan)
    ? readinessProfile.loan as Record<string, unknown>
    : {};

  return {
    monthlyIncomeUsed: numberOrNull(row.monthly_income) ?? numberOrNull(canonical.monthlyIncomeUsed) ?? numberOrNull(financials.monthlyIncomeUsed) ?? 0,
    monthlyIncomeSource: String(row.monthly_income_source ?? canonical.monthlyIncomeSource ?? financials.monthlyIncomeSource ?? ""),
    nonHousingLivingExpenses: numberOrNull(row.non_housing_living_expenses) ?? numberOrNull(canonical.nonHousingLivingExpenses) ?? numberOrNull(financials.nonHousingLivingExpenses) ?? numberOrNull(row.monthly_expenses) ?? 0,
    housingPayment: numberOrNull(row.housing_payment) ?? numberOrNull(canonical.housingPayment) ?? numberOrNull(financials.housingPayment) ?? 0,
    monthlyDebtPayments: numberOrNull(row.monthly_debt_payments) ?? numberOrNull(canonical.monthlyDebtPayments) ?? numberOrNull(financials.monthlyDebtPayments) ?? 0,
    totalMonthlyObligations: numberOrNull(row.total_monthly_obligations) ?? numberOrNull(canonical.totalMonthlyObligations) ?? numberOrNull(financials.totalMonthlyObligations) ?? 0,
    monthlySurplus: numberOrNull(row.monthly_surplus) ?? numberOrNull(canonical.monthlySurplus) ?? numberOrNull(financials.monthlySurplus) ?? 0,
    debtToIncome: numberOrNull(row.debt_to_income) ?? numberOrNull(canonical.debtToIncome) ?? numberOrNull(ratios.debtToIncome),
    housingRatio: numberOrNull(row.housing_ratio) ?? numberOrNull(canonical.housingRatio) ?? numberOrNull(ratios.housingRatio),
    totalObligationsRatio: numberOrNull(row.total_obligations_ratio) ?? numberOrNull(canonical.totalObligationsRatio) ?? numberOrNull(ratios.totalObligationsRatio),
    savingsRunwayMonths: numberOrNull(row.savings_runway_months) ?? numberOrNull(canonical.savingsRunwayMonths) ?? numberOrNull(financials.savingsRunwayMonths) ?? 0,
    downPaymentPercent: numberOrNull(row.down_payment_percent) ?? numberOrNull(canonical.downPaymentPercent) ?? numberOrNull(loan.downPaymentPercent),
    readinessScore: numberOrNull(row.readiness_score) ?? 0,
    rawReadinessScore: numberOrNull(row.raw_readiness_score) ?? numberOrNull(row.readiness_score) ?? 0,
    maxReadinessScore: numberOrNull(row.max_readiness_score) ?? 100,
    readinessBand: String(row.readiness_band ?? "")
  };
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
  const canonicalSummary = getCanonicalSummary(latest);
  const assumptions = { source: "saved_loan_readiness_application", userEnteredData: true, basedOnUserEnteredData: true, lenderVerificationRequired: true, savingsRunway: SAVINGS_RUNWAY_ASSUMPTION };
  const labels = {
    monthlyIncomeUsed: "Monthly income used",
    nonHousingLivingExpenses: "Living expenses, excluding housing and debt",
    housingPayment: "Housing payment",
    monthlyDebtPayments: "Monthly debt payments",
    totalMonthlyObligations: "Total monthly obligations",
    monthlySurplus: "Monthly surplus",
    debtToIncome: "Debt-to-Income (debt payments only)",
    housingRatio: "Housing Ratio (rent/mortgage only)",
    totalObligationsRatio: "Total Monthly Pressure (housing + living expenses + debt)",
    savingsRunwayMonths: "Savings runway months",
    downPaymentPercent: "Down payment percent"
  };
  const snapshot = { generatedAt, reportVersion: REPORT_VERSION, type: "loan_readiness", application: latest, canonicalSummary, labels, basedOnUserEnteredData: true, assumptions, disclaimerText: REPORT_DISCLAIMER, sourceContext: "loan_readiness" };
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
