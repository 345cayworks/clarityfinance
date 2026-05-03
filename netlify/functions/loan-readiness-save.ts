import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";

const allowedStatuses = new Set(["draft", "submitted", "in_review", "approved", "rejected"]);

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requirePremiumUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<Record<string, unknown>>(event) ?? {};
  const id = String(body.id ?? randomId("lra"));
  const status = allowedStatuses.has(String(body.status ?? "")) ? String(body.status) : "draft";
  const savedRows = await sql`INSERT INTO loan_readiness_applications (id,user_id,preferred_lender,loan_type,loan_purpose,requested_amount,purchase_price,down_payment_available,loan_term_years,estimated_interest_rate,readiness_score,readiness_band,debt_to_income,housing_ratio,monthly_income,monthly_expenses,monthly_debt_payments,monthly_surplus,missing_documents_json,checklist_json,application_json,status,advisor_request_id,updated_at)
  VALUES (${id},${access.user.id},${String(body.preferredLender ?? "")},${String(body.loanType ?? "")},${String(body.loanPurpose ?? "")},${toNumber(body.requestedAmount)},${toNumber(body.purchasePrice)},${toNumber(body.downPaymentAvailable)},${toNumber(body.loanTermYears)},${toNumber(body.estimatedInterestRate)},${toNumber(body.readinessScore)},${String(body.readinessBand ?? "")},${toNumber(body.debtToIncome)},${toNumber(body.housingRatio)},${toNumber(body.monthlyIncome)},${toNumber(body.monthlyExpenses)},${toNumber(body.monthlyDebtPayments)},${toNumber(body.monthlySurplus)},${JSON.stringify(body.missingDocuments ?? [])}::jsonb,${JSON.stringify(body.checklist ?? {})}::jsonb,${JSON.stringify(body.application ?? body)}::jsonb,${status},${String(body.advisorRequestId ?? "")},now())
  ON CONFLICT (id) DO UPDATE SET preferred_lender=EXCLUDED.preferred_lender, loan_type=EXCLUDED.loan_type, loan_purpose=EXCLUDED.loan_purpose, requested_amount=EXCLUDED.requested_amount, purchase_price=EXCLUDED.purchase_price, down_payment_available=EXCLUDED.down_payment_available, loan_term_years=EXCLUDED.loan_term_years, estimated_interest_rate=EXCLUDED.estimated_interest_rate, readiness_score=EXCLUDED.readiness_score, readiness_band=EXCLUDED.readiness_band, debt_to_income=EXCLUDED.debt_to_income, housing_ratio=EXCLUDED.housing_ratio, monthly_income=EXCLUDED.monthly_income, monthly_expenses=EXCLUDED.monthly_expenses, monthly_debt_payments=EXCLUDED.monthly_debt_payments, monthly_surplus=EXCLUDED.monthly_surplus, missing_documents_json=EXCLUDED.missing_documents_json, checklist_json=EXCLUDED.checklist_json, application_json=EXCLUDED.application_json, status=EXCLUDED.status, advisor_request_id=EXCLUDED.advisor_request_id, updated_at=now() WHERE loan_readiness_applications.user_id = EXCLUDED.user_id RETURNING id` as Array<{ id: string }>;
  if (!savedRows[0]) return json(403, { error: "Cannot update this loan readiness application." });
  return json(200, { success: true, id });
};
