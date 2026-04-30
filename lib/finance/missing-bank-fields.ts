const hasValue = (value: unknown) => {
  if (typeof value === "boolean") return true;
  return value !== null && value !== undefined && String(value).trim() !== "";
};

export function getMissingBankFields(bundle: Record<string, any>) {
  const p = bundle.profile ?? {};
  const e = bundle.expenseProfile ?? {};
  const h = bundle.housingProfile ?? {};
  const d = bundle.debts?.[0] ?? {};
  const s = bundle.savingsProfile ?? {};
  const g = bundle.goals ?? {};
  const income = bundle.incomeSources?.[0] ?? {};
  const miss = (v: any) => !hasValue(v);
  const docFields = ["has_id","has_proof_of_address","has_payslips","has_employment_letter","has_bank_statements","has_debt_statements","has_credit_report","has_purchase_agreement","has_valuation","has_business_financials","has_tax_returns"];

  return {
    Personal: ["customer_name","date_of_birth","nationality","household_status","dependents","citizenship_status","work_permit_required","credit_score_known","bankruptcy_history","missed_payments_history"].filter((k)=>miss(p[k])),
    Contact: ["phone","alternate_phone","physical_address","mailing_address","country_or_market","preferred_currency"].filter((k)=>miss(p[k])),
    Employment: ["employment_type","employer","employer_address","job_title","employment_length"].filter((k)=>miss(p[k])),
    Income: ["monthly_gross_income","monthly_net_income","other_income_amount","other_income_description"].filter((k)=>miss(p[k])).concat(["frequency","stability","type","label","monthly_amount"].filter((k)=>miss(income[k]))),
    Expenses: ["utilities","transport","groceries","insurance","childcare","discretionary","other"].filter((k)=>miss(e[k])),
    Housing: ["housing_status","rent_amount","mortgage_balance","mortgage_payment","mortgage_rate","estimated_home_value","estimated_room_rental_income"].filter((k)=>miss(h[k])),
    Debts: ["name","type","balance","interest_rate","monthly_payment"].filter((k)=>miss(d[k])),
    "Savings/Assets": ["cash_savings","emergency_fund","down_payment_savings","investments","retirement_savings","other_assets","source_of_down_payment"].filter((k)=>miss(s[k]) && miss(p[k])),
    "Loan Details": ["target_goal","loan_purpose","requested_loan_amount","desired_loan_term_years","target_home_price","purchase_price","borrower_contribution","security_offered","security_value"].filter((k)=>miss(g[k]) && miss(p[k])),
    Documents: docFields.filter((k)=>p[k] === false || p[k] === null || p[k] === undefined)
  };
}
