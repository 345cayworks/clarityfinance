import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";

const allowedStatuses = new Set(["draft", "submitted", "in_review", "approved", "rejected"]);

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

async function ensureCanonicalColumns() {
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS non_housing_living_expenses numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS housing_payment numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS total_monthly_obligations numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS total_obligations_ratio numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS monthly_income_source text`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS savings_runway_months numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS down_payment_percent numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS raw_readiness_score numeric`;
  await sql`ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS max_readiness_score numeric DEFAULT 100`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requirePremiumUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  const id = String(body.id ?? randomId("lra"));
  const status = allowedStatuses.has(String(body.status ?? "")) ? String(body.status) : "draft";
  await ensureCanonicalColumns();
  const savedRows = await sql`INSERT INTO loan_readiness_applications (id,user_id,preferred_lender,loan_type,loan_purpose,requested_amount,purchase_price,down_payment_available,loan_term_years,estimated_interest_rate,readiness_score,raw_readiness_score,max_readiness_score,readiness_band,debt_to_income,housing_ratio,total_obligations_ratio,monthly_income,monthly_income_source,monthly_expenses,non_housing_living_expenses,housing_payment,monthly_debt_payments,total_monthly_obligations,monthly_surplus,savings_runway_months,down_payment_percent,missing_documents_json,checklist_json,application_json,status,advisor_request_id,updated_at)
  VALUES (${id},${access.user.id},${String(body.preferredLender ?? "")},${String(body.loanType ?? "")},${String(body.loanPurpose ?? "")},${toNumber(body.requestedAmount)},${toNumber(body.purchasePrice)},${toNumber(body.downPaymentAvailable)},${toNumber(body.loanTermYears)},${toNumber(body.estimatedInterestRate)},${toNumber(body.readinessScore)},${toNumber(body.rawReadinessScore ?? body.readinessScore)},${toNumber(body.maxReadinessScore ?? 100)},${String(body.readinessBand ?? "")},${toNullableNumber(body.debtToIncome)},${toNullableNumber(body.housingRatio)},${toNullableNumber(body.totalObligationsRatio)},${toNumber(body.monthlyIncome)},${String(body.monthlyIncomeSource ?? "")},${toNumber(body.monthlyExpenses)},${toNumber(body.nonHousingLivingExpenses ?? body.monthlyExpenses)},${toNumber(body.housingPayment)},${toNumber(body.monthlyDebtPayments)},${toNumber(body.totalMonthlyObligations)},${toNumber(body.monthlySurplus)},${toNumber(body.savingsRunwayMonths)},${toNullableNumber(body.downPaymentPercent)},${JSON.stringify(body.missingDocuments ?? [])}::jsonb,${JSON.stringify(body.checklist ?? {})}::jsonb,${JSON.stringify(body.application ?? body)}::jsonb,${status},${String(body.advisorRequestId ?? "")},now())
  ON CONFLICT (id) DO UPDATE SET preferred_lender=EXCLUDED.preferred_lender, loan_type=EXCLUDED.loan_type, loan_purpose=EXCLUDED.loan_purpose, requested_amount=EXCLUDED.requested_amount, purchase_price=EXCLUDED.purchase_price, down_payment_available=EXCLUDED.down_payment_available, loan_term_years=EXCLUDED.loan_term_years, estimated_interest_rate=EXCLUDED.estimated_interest_rate, readiness_score=EXCLUDED.readiness_score, raw_readiness_score=EXCLUDED.raw_readiness_score, max_readiness_score=EXCLUDED.max_readiness_score, readiness_band=EXCLUDED.readiness_band, debt_to_income=EXCLUDED.debt_to_income, housing_ratio=EXCLUDED.housing_ratio, total_obligations_ratio=EXCLUDED.total_obligations_ratio, monthly_income=EXCLUDED.monthly_income, monthly_income_source=EXCLUDED.monthly_income_source, monthly_expenses=EXCLUDED.monthly_expenses, non_housing_living_expenses=EXCLUDED.non_housing_living_expenses, housing_payment=EXCLUDED.housing_payment, monthly_debt_payments=EXCLUDED.monthly_debt_payments, total_monthly_obligations=EXCLUDED.total_monthly_obligations, monthly_surplus=EXCLUDED.monthly_surplus, savings_runway_months=EXCLUDED.savings_runway_months, down_payment_percent=EXCLUDED.down_payment_percent, missing_documents_json=EXCLUDED.missing_documents_json, checklist_json=EXCLUDED.checklist_json, application_json=EXCLUDED.application_json, status=EXCLUDED.status, advisor_request_id=EXCLUDED.advisor_request_id, updated_at=now() WHERE loan_readiness_applications.user_id = EXCLUDED.user_id RETURNING id` as Array<{ id: string }>;
  if (!savedRows[0]) return json(403, { error: "Cannot update this loan readiness application." });
  return json(200, { success: true, id });
};
