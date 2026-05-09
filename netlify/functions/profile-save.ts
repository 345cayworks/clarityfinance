import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { getUserApprovalStatus } from "./_approval";
import { json, parseJsonBody, randomId } from "./_utils";
import { notifyAdmin } from "../../lib/notifications/notify";

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

const logSaveError = (error: unknown) => {
  const safeError = error instanceof Error ? { name: error.name, message: error.message } : { message: "Unknown profile-save error" };
  console.error("profile-save database write failed", safeError);
};

const isMissingRoleColumnError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === "42703" || maybeError.message?.toLowerCase().includes("role") === true;
};

type UserIdRow = { id: string };

async function ensureProfileColumns() {
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text`;
  await sql`ALTER TABLE expense_profiles ADD COLUMN IF NOT EXISTS water numeric DEFAULT 0`;
  await sql`ALTER TABLE expense_profiles ADD COLUMN IF NOT EXISTS entertainment numeric DEFAULT 0`;
  await sql`ALTER TABLE expense_profiles ADD COLUMN IF NOT EXISTS travel numeric DEFAULT 0`;
}

const upsertUser = async (userId: string, identityUser: Awaited<ReturnType<typeof getIdentityUser>>) => {
  if (!identityUser) return userId;

  const existingUserByEmail = await sql`SELECT id FROM users WHERE email = ${identityUser.email} LIMIT 1` as UserIdRow[];
  const effectiveUserId = existingUserByEmail[0]?.id ?? userId;

  try {
    await sql`
      INSERT INTO users (id, email, name, role, approval_status, account_status)
      VALUES (${effectiveUserId}, ${identityUser.email}, ${identityUser.name}, 'user', 'pending', 'active')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        role = users.role,
        approval_status = users.approval_status,
        account_status = COALESCE(users.account_status, 'active'),
        updated_at = NOW()
    `;
  } catch (error) {
    if (!isMissingRoleColumnError(error)) throw error;
    await sql`
      INSERT INTO users (id, email, name, approval_status, account_status)
      VALUES (${effectiveUserId}, ${identityUser.email}, ${identityUser.name}, 'pending', 'active')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        approval_status = COALESCE(users.approval_status, 'pending'),
        account_status = COALESCE(users.account_status, 'active'),
        updated_at = NOW()
    `;
  }

  return effectiveUserId;
};

function getIncomeSourcesFromBody(body: AnyRecord) {
  const sourceNumbers = [1, 2, 3];
  const multiSources = sourceNumbers
    .map((slot) => ({
      type: String(body[`incomeSource${slot}Type`] ?? ""),
      label: String(body[`incomeSource${slot}Label`] ?? ""),
      monthlyAmount: toNumber(body[`incomeSource${slot}MonthlyAmount`]),
      frequency: String(body[`incomeSource${slot}Frequency`] ?? "monthly"),
      stability: String(body[`incomeSource${slot}Stability`] ?? "stable")
    }))
    .filter((source) => source.monthlyAmount > 0 || source.label.trim() || source.type.trim());

  if (multiSources.length > 0) return multiSources;

  const legacyAmount = toNumber(body.incomeMonthlyAmount);
  if (legacyAmount <= 0) return [];
  return [{
    type: String(body.incomeType ?? "salary"),
    label: String(body.incomeLabel ?? "Primary Income"),
    monthlyAmount: legacyAmount,
    frequency: String(body.incomeFrequency ?? "monthly"),
    stability: String(body.incomeStability ?? "stable")
  }];
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    const identityUser = await getIdentityUser(event);
    if (!identityUser) return json(401, { error: "Unauthorized: missing or invalid Identity token." });

    const body = (parseJsonBody<AnyRecord>(event) ?? {}) as AnyRecord;
    const userId = await upsertUser(identityUser.id, identityUser);
    const approval = await getUserApprovalStatus(identityUser);

    if (!userId) return json(500, { error: "Profile could not be saved. Please try again." });
    if (!approval.approved) await notifyAdmin("user_pending_approval", { userId, email: identityUser.email, name: identityUser.name });

    const incomeSources = getIncomeSourcesFromBody(body);
    const totalMonthlyIncome = incomeSources.reduce((sum, source) => sum + source.monthlyAmount, 0);
    const primaryIncome = incomeSources[0];
    const submittedEmail = String(body.email ?? "").trim();
    const effectiveEmail = submittedEmail || identityUser.email;

    await ensureProfileColumns();

    await sql`
    INSERT INTO profiles (
      id, user_id, country_or_market, preferred_currency, age_range, employment_type, household_status, dependents,
      credit_score_known, credit_score_or_profile, customer_name, date_of_birth, physical_address, phone, employer, job_title,
      nationality, citizenship_status, work_permit_required, work_permit_expiry_date, mailing_address, alternate_phone,
      employment_length, employer_address, monthly_gross_income, monthly_net_income, other_income_amount, other_income_description,
      loan_purpose, requested_loan_amount, desired_loan_term_years, property_type, property_location, property_identified,
      purchase_agreement_available, primary_bank_name, existing_bank_relationship, bank_statements_available,
      missed_payments_history, bankruptcy_history, has_id, has_proof_of_address, has_payslips, has_employment_letter,
      has_bank_statements, has_debt_statements, has_credit_report, has_purchase_agreement, has_valuation,
      has_down_payment_proof, has_business_financials, marital_status, other_assets, source_of_down_payment, purchase_price, borrower_contribution, security_offered, security_value, has_tax_returns, email
    )
    VALUES (
      ${randomId("pro")}, ${userId}, ${String(body.countryOrMarket ?? "")}, ${String(body.preferredCurrency ?? "")}, ${String(body.ageRange ?? "")}, ${String(body.employmentType ?? "")}, ${String(body.householdStatus ?? "")}, ${toNumber(body.dependents)},
      ${toBoolean(body.creditScoreKnown)}, ${String(body.creditScoreOrProfile ?? "") || null}, ${String(body.customerName ?? "")}, ${String(body.dateOfBirth ?? "")}, ${String(body.physicalAddress ?? "")}, ${String(body.phone ?? "")}, ${String(body.employer ?? "")}, ${String(body.jobTitle ?? "")},
      ${String(body.nationality ?? "")}, ${String(body.citizenshipStatus ?? "")}, ${toBoolean(body.workPermitRequired)}, ${String(body.workPermitExpiryDate ?? "")}, ${String(body.mailingAddress ?? "")}, ${String(body.alternatePhone ?? "")},
      ${String(body.employmentLength ?? "")}, ${String(body.employerAddress ?? "")}, ${toNumber(body.monthlyGrossIncome) || totalMonthlyIncome}, ${toNumber(body.monthlyNetIncome) || totalMonthlyIncome}, ${toNumber(body.otherIncomeAmount)}, ${String(body.otherIncomeDescription ?? "")},
      ${String(body.loanPurpose ?? "")}, ${toNumber(body.requestedLoanAmount)}, ${Math.trunc(toNumber(body.desiredLoanTermYears)) || null}, ${String(body.propertyType ?? "")}, ${String(body.propertyLocation ?? "")}, ${toBoolean(body.propertyIdentified)},
      ${toBoolean(body.purchaseAgreementAvailable)}, ${String(body.primaryBankName ?? "")}, ${toBoolean(body.existingBankRelationship)}, ${toBoolean(body.bankStatementsAvailable)},
      ${toBoolean(body.missedPaymentsHistory)}, ${toBoolean(body.bankruptcyHistory)}, ${toBoolean(body.hasID)}, ${toBoolean(body.hasProofOfAddress)}, ${toBoolean(body.hasPayslips)}, ${toBoolean(body.hasEmploymentLetter)},
      ${toBoolean(body.hasBankStatements)}, ${toBoolean(body.hasDebtStatements)}, ${toBoolean(body.hasCreditReport)}, ${toBoolean(body.hasPurchaseAgreement)}, ${toBoolean(body.hasValuation)},
      ${toBoolean(body.hasDownPaymentProof)}, ${toBoolean(body.hasBusinessFinancials)}, ${String(body.maritalStatus ?? "")}, ${toNumber(body.otherAssets)}, ${String(body.sourceOfDownPayment ?? "")}, ${toNumber(body.purchasePrice)}, ${toNumber(body.borrowerContribution)}, ${String(body.securityOffered ?? "")}, ${toNumber(body.securityValue)}, ${toBoolean(body.hasTaxReturns)}, ${effectiveEmail}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      country_or_market = EXCLUDED.country_or_market,
      preferred_currency = EXCLUDED.preferred_currency,
      age_range = EXCLUDED.age_range,
      employment_type = EXCLUDED.employment_type,
      household_status = EXCLUDED.household_status,
      dependents = EXCLUDED.dependents,
      credit_score_known = EXCLUDED.credit_score_known,
      credit_score_or_profile = EXCLUDED.credit_score_or_profile,
      customer_name = EXCLUDED.customer_name,
      date_of_birth = EXCLUDED.date_of_birth,
      physical_address = EXCLUDED.physical_address,
      phone = EXCLUDED.phone,
      employer = EXCLUDED.employer,
      job_title = EXCLUDED.job_title,
      nationality = EXCLUDED.nationality,
      citizenship_status = EXCLUDED.citizenship_status,
      work_permit_required = EXCLUDED.work_permit_required,
      work_permit_expiry_date = EXCLUDED.work_permit_expiry_date,
      mailing_address = EXCLUDED.mailing_address,
      alternate_phone = EXCLUDED.alternate_phone,
      employment_length = EXCLUDED.employment_length,
      employer_address = EXCLUDED.employer_address,
      monthly_gross_income = EXCLUDED.monthly_gross_income,
      monthly_net_income = EXCLUDED.monthly_net_income,
      other_income_amount = EXCLUDED.other_income_amount,
      other_income_description = EXCLUDED.other_income_description,
      loan_purpose = EXCLUDED.loan_purpose,
      requested_loan_amount = EXCLUDED.requested_loan_amount,
      desired_loan_term_years = EXCLUDED.desired_loan_term_years,
      property_type = EXCLUDED.property_type,
      property_location = EXCLUDED.property_location,
      property_identified = EXCLUDED.property_identified,
      purchase_agreement_available = EXCLUDED.purchase_agreement_available,
      primary_bank_name = EXCLUDED.primary_bank_name,
      existing_bank_relationship = EXCLUDED.existing_bank_relationship,
      bank_statements_available = EXCLUDED.bank_statements_available,
      missed_payments_history = EXCLUDED.missed_payments_history,
      bankruptcy_history = EXCLUDED.bankruptcy_history,
      has_id = EXCLUDED.has_id,
      has_proof_of_address = EXCLUDED.has_proof_of_address,
      has_payslips = EXCLUDED.has_payslips,
      has_employment_letter = EXCLUDED.has_employment_letter,
      has_bank_statements = EXCLUDED.has_bank_statements,
      has_debt_statements = EXCLUDED.has_debt_statements,
      has_credit_report = EXCLUDED.has_credit_report,
      has_purchase_agreement = EXCLUDED.has_purchase_agreement,
      has_valuation = EXCLUDED.has_valuation,
      has_down_payment_proof = EXCLUDED.has_down_payment_proof,
      has_business_financials = EXCLUDED.has_business_financials,
      marital_status = EXCLUDED.marital_status,
      other_assets = EXCLUDED.other_assets,
      source_of_down_payment = EXCLUDED.source_of_down_payment,
      purchase_price = EXCLUDED.purchase_price,
      borrower_contribution = EXCLUDED.borrower_contribution,
      security_offered = EXCLUDED.security_offered,
      security_value = EXCLUDED.security_value,
      has_tax_returns = EXCLUDED.has_tax_returns,
      email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email, ${identityUser.email}),
      updated_at = NOW()
  `;

    await sql`
    INSERT INTO expense_profiles (id, user_id, housing, utilities, water, transport, groceries, insurance, childcare, entertainment, travel, discretionary, other)
    VALUES (${randomId("exp")}, ${userId}, ${toNumber(body.expenseHousing)}, ${toNumber(body.expenseUtilities)}, ${toNumber(body.expenseWater)}, ${toNumber(body.expenseTransport)}, ${toNumber(body.expenseGroceries)}, ${toNumber(body.expenseInsurance)}, ${toNumber(body.expenseChildcare)}, ${toNumber(body.expenseEntertainment)}, ${toNumber(body.expenseTravel)}, ${toNumber(body.expenseDiscretionary)}, ${toNumber(body.expenseOther)})
    ON CONFLICT (user_id) DO UPDATE SET
      housing = EXCLUDED.housing,
      utilities = EXCLUDED.utilities,
      water = EXCLUDED.water,
      transport = EXCLUDED.transport,
      groceries = EXCLUDED.groceries,
      insurance = EXCLUDED.insurance,
      childcare = EXCLUDED.childcare,
      entertainment = EXCLUDED.entertainment,
      travel = EXCLUDED.travel,
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
    for (const [index, source] of incomeSources.slice(0, 3).entries()) {
      await sql`
        INSERT INTO income_sources (id, user_id, type, label, monthly_amount, frequency, stability)
        VALUES (${randomId("inc")}, ${userId}, ${source.type || (index === 0 ? "salary" : "other")}, ${source.label || `Income Source ${index + 1}`}, ${source.monthlyAmount}, ${source.frequency || "monthly"}, ${source.stability || "stable"})
      `;
    }

    if (primaryIncome) {
      await sql`
        UPDATE profiles
        SET monthly_gross_income = ${toNumber(body.monthlyGrossIncome) || totalMonthlyIncome},
            monthly_net_income = ${toNumber(body.monthlyNetIncome) || totalMonthlyIncome},
            other_income_amount = ${incomeSources.slice(1).reduce((sum, source) => sum + source.monthlyAmount, 0)},
            other_income_description = ${incomeSources.slice(1).map((source) => source.label || source.type).filter(Boolean).join(", ")}
        WHERE user_id = ${userId}
      `;
    }

    const submittedDebtFields = ["debtName", "debtType", "debtBalance", "debtInterestRate", "debtMonthlyPayment"].some((key) =>
      Object.prototype.hasOwnProperty.call(body, key)
    );
    if (submittedDebtFields) {
      await sql`DELETE FROM debts WHERE user_id = ${userId}`;
      if (String(body.debtName ?? "").trim()) {
        await sql`
        INSERT INTO debts (id, user_id, name, type, balance, interest_rate, monthly_payment)
        VALUES (${randomId("deb")}, ${userId}, ${String(body.debtName ?? "")}, ${String(body.debtType ?? "other")}, ${toNumber(body.debtBalance)}, ${toNumber(body.debtInterestRate)}, ${toNumber(body.debtMonthlyPayment)})
      `;
      }
    }

    return json(200, { success: true, redirectTo: approval.approved ? "/app/dashboard" : "/app/pending-approval", totalMonthlyIncome });
  } catch (error) {
    logSaveError(error);
    return json(500, { error: "Profile could not be saved. Please try again." });
  }
};
