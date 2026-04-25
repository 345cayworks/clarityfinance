import type { Handler } from "@netlify/functions";
import { randomId } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { json, parseJsonBody, requireSession } from "./_utils";

type AnyRecord = Record<string, unknown>;

const n = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const session = await requireSession(event);
  if (!session) return json(401, { error: "Unauthorized" });

  const body = (parseJsonBody<AnyRecord>(event) ?? {}) as AnyRecord;
  const userId = session.sub;

  await sql`
    INSERT INTO profiles (id, user_id, country_or_market, preferred_currency, age_range, employment_type, household_status, dependents, credit_score_known, credit_score_or_profile)
    VALUES (${randomId("pro")}, ${userId}, ${String(body.countryOrMarket ?? "")}, ${String(body.preferredCurrency ?? "")}, ${String(body.ageRange ?? "")}, ${String(body.employmentType ?? "")}, ${String(body.householdStatus ?? "")}, ${n(body.dependents)}, ${Boolean(body.creditScoreKnown)}, ${String(body.creditScoreOrProfile ?? "") || null})
    ON CONFLICT (user_id) DO UPDATE SET
      country_or_market = EXCLUDED.country_or_market,
      preferred_currency = EXCLUDED.preferred_currency,
      age_range = EXCLUDED.age_range,
      employment_type = EXCLUDED.employment_type,
      household_status = EXCLUDED.household_status,
      dependents = EXCLUDED.dependents,
      credit_score_known = EXCLUDED.credit_score_known,
      credit_score_or_profile = EXCLUDED.credit_score_or_profile,
      updated_at = NOW()
  `;

  await sql`
    INSERT INTO expense_profiles (id, user_id, housing, utilities, transport, groceries, insurance, childcare, discretionary, other)
    VALUES (${randomId("exp")}, ${userId}, ${n(body.expenseHousing)}, ${n(body.expenseUtilities)}, ${n(body.expenseTransport)}, ${n(body.expenseGroceries)}, ${n(body.expenseInsurance)}, ${n(body.expenseChildcare)}, ${n(body.expenseDiscretionary)}, ${n(body.expenseOther)})
    ON CONFLICT (user_id) DO UPDATE SET
      housing = EXCLUDED.housing,
      utilities = EXCLUDED.utilities,
      transport = EXCLUDED.transport,
      groceries = EXCLUDED.groceries,
      insurance = EXCLUDED.insurance,
      childcare = EXCLUDED.childcare,
      discretionary = EXCLUDED.discretionary,
      other = EXCLUDED.other,
      updated_at = NOW()
  `;

  await sql`
    INSERT INTO housing_profiles (id, user_id, housing_status, rent_amount, mortgage_balance, mortgage_rate, mortgage_payment, estimated_home_value, spare_room_available, estimated_room_rental_income)
    VALUES (${randomId("hou")}, ${userId}, ${String(body.housingStatus ?? "")}, ${n(body.rentAmount)}, ${n(body.mortgageBalance)}, ${n(body.mortgageRate)}, ${n(body.mortgagePayment)}, ${n(body.estimatedHomeValue)}, ${Boolean(body.spareRoomAvailable)}, ${n(body.estimatedRoomRentalIncome)})
    ON CONFLICT (user_id) DO UPDATE SET
      housing_status = EXCLUDED.housing_status,
      rent_amount = EXCLUDED.rent_amount,
      mortgage_balance = EXCLUDED.mortgage_balance,
      mortgage_rate = EXCLUDED.mortgage_rate,
      mortgage_payment = EXCLUDED.mortgage_payment,
      estimated_home_value = EXCLUDED.estimated_home_value,
      spare_room_available = EXCLUDED.spare_room_available,
      estimated_room_rental_income = EXCLUDED.estimated_room_rental_income,
      updated_at = NOW()
  `;

  await sql`
    INSERT INTO savings_profiles (id, user_id, cash_savings, emergency_fund, investments, retirement_savings, down_payment_savings)
    VALUES (${randomId("sav")}, ${userId}, ${n(body.cashSavings)}, ${n(body.emergencyFund)}, ${n(body.investments)}, ${n(body.retirementSavings)}, ${n(body.downPaymentSavings)})
    ON CONFLICT (user_id) DO UPDATE SET
      cash_savings = EXCLUDED.cash_savings,
      emergency_fund = EXCLUDED.emergency_fund,
      investments = EXCLUDED.investments,
      retirement_savings = EXCLUDED.retirement_savings,
      down_payment_savings = EXCLUDED.down_payment_savings,
      updated_at = NOW()
  `;

  await sql`
    INSERT INTO goals (id, user_id, target_goal, target_home_price, target_savings_goal, target_debt_reduction, target_monthly_cash_flow, goal_timeframe)
    VALUES (${randomId("gol")}, ${userId}, ${String(body.targetGoal ?? "")}, ${n(body.targetHomePrice)}, ${n(body.targetSavingsGoal)}, ${n(body.targetDebtReduction)}, ${n(body.targetMonthlyCashFlow)}, ${String(body.goalTimeframe ?? "")})
    ON CONFLICT (user_id) DO UPDATE SET
      target_goal = EXCLUDED.target_goal,
      target_home_price = EXCLUDED.target_home_price,
      target_savings_goal = EXCLUDED.target_savings_goal,
      target_debt_reduction = EXCLUDED.target_debt_reduction,
      target_monthly_cash_flow = EXCLUDED.target_monthly_cash_flow,
      goal_timeframe = EXCLUDED.goal_timeframe,
      updated_at = NOW()
  `;

  await sql`DELETE FROM income_sources WHERE user_id = ${userId}`;
  if (n(body.incomeMonthlyAmount) > 0) {
    await sql`
      INSERT INTO income_sources (id, user_id, type, label, monthly_amount, frequency, stability)
      VALUES (${randomId("inc")}, ${userId}, ${String(body.incomeType ?? "salary")}, ${String(body.incomeLabel ?? "Primary Income")}, ${n(body.incomeMonthlyAmount)}, ${String(body.incomeFrequency ?? "monthly")}, ${String(body.incomeStability ?? "stable")})
    `;
  }

  await sql`DELETE FROM debts WHERE user_id = ${userId}`;
  if (String(body.debtName ?? "").trim()) {
    await sql`
      INSERT INTO debts (id, user_id, name, type, balance, interest_rate, monthly_payment)
      VALUES (${randomId("deb")}, ${userId}, ${String(body.debtName ?? "")}, ${String(body.debtType ?? "other")}, ${n(body.debtBalance)}, ${n(body.debtInterestRate)}, ${n(body.debtMonthlyPayment)})
    `;
  }

  return json(200, { success: true, redirectTo: "/app/dashboard" });
};
