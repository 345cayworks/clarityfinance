import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json, parseJsonBody, randomId } from "./_utils";

type AnyRecord = Record<string, unknown>;

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return 0;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes";
  }
  if (typeof value === "number") return value === 1;
  return false;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  const body = (parseJsonBody<AnyRecord>(event) ?? {}) as AnyRecord;
  const userId = identityUser.id;

  await sql`
    INSERT INTO users (id, email, name, role)
    VALUES (${userId}, ${identityUser.email}, ${identityUser.name}, ${identityUser.role})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      updated_at = NOW()
  `;

  await sql`
    INSERT INTO profiles (id, user_id, country_or_market, preferred_currency, age_range, employment_type, household_status, dependents, credit_score_known, credit_score_or_profile)
    VALUES (${randomId("pro")}, ${userId}, ${String(body.countryOrMarket ?? "")}, ${String(body.preferredCurrency ?? "")}, ${String(body.ageRange ?? "")}, ${String(body.employmentType ?? "")}, ${String(body.householdStatus ?? "")}, ${toNumber(body.dependents)}, ${toBoolean(body.creditScoreKnown)}, ${String(body.creditScoreOrProfile ?? "") || null})
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
    VALUES (${randomId("exp")}, ${userId}, ${toNumber(body.expenseHousing)}, ${toNumber(body.expenseUtilities)}, ${toNumber(body.expenseTransport)}, ${toNumber(body.expenseGroceries)}, ${toNumber(body.expenseInsurance)}, ${toNumber(body.expenseChildcare)}, ${toNumber(body.expenseDiscretionary)}, ${toNumber(body.expenseOther)})
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
    VALUES (${randomId("hou")}, ${userId}, ${String(body.housingStatus ?? "")}, ${toNumber(body.rentAmount)}, ${toNumber(body.mortgageBalance)}, ${toNumber(body.mortgageRate)}, ${toNumber(body.mortgagePayment)}, ${toNumber(body.estimatedHomeValue)}, ${toBoolean(body.spareRoomAvailable)}, ${toNumber(body.estimatedRoomRentalIncome)})
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
    VALUES (${randomId("sav")}, ${userId}, ${toNumber(body.cashSavings)}, ${toNumber(body.emergencyFund)}, ${toNumber(body.investments)}, ${toNumber(body.retirementSavings)}, ${toNumber(body.downPaymentSavings)})
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
    VALUES (${randomId("gol")}, ${userId}, ${String(body.targetGoal ?? "")}, ${toNumber(body.targetHomePrice)}, ${toNumber(body.targetSavingsGoal)}, ${toNumber(body.targetDebtReduction)}, ${toNumber(body.targetMonthlyCashFlow)}, ${String(body.goalTimeframe ?? "")})
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
  if (toNumber(body.incomeMonthlyAmount) > 0) {
    await sql`
      INSERT INTO income_sources (id, user_id, type, label, monthly_amount, frequency, stability)
      VALUES (${randomId("inc")}, ${userId}, ${String(body.incomeType ?? "salary")}, ${String(body.incomeLabel ?? "Primary Income")}, ${toNumber(body.incomeMonthlyAmount)}, ${String(body.incomeFrequency ?? "monthly")}, ${String(body.incomeStability ?? "stable")})
    `;
  }

  await sql`DELETE FROM debts WHERE user_id = ${userId}`;
  if (String(body.debtName ?? "").trim()) {
    await sql`
      INSERT INTO debts (id, user_id, name, type, balance, interest_rate, monthly_payment)
      VALUES (${randomId("deb")}, ${userId}, ${String(body.debtName ?? "")}, ${String(body.debtType ?? "other")}, ${toNumber(body.debtBalance)}, ${toNumber(body.debtInterestRate)}, ${toNumber(body.debtMonthlyPayment)})
    `;
  }

  return json(200, { success: true, redirectTo: "/app/dashboard" });
};
