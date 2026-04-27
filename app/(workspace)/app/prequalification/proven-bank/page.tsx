"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";

type SavedOnboardingData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
};

type PrequalForm = {
  fullName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  dateOfBirth: string;
  countryMarket: string;
  residentialAddress: string;
  mailingAddress: string;
  nationality: string;
  citizenshipStatus: string;
  workPermitRequired: "yes" | "no";
  workPermitExpiry: string;

  employmentStatus: string;
  employerBusinessName: string;
  employerAddress: string;
  jobTitle: string;
  lengthOfEmployment: string;
  monthlyGrossIncome: string;
  monthlyNetIncome: string;
  otherIncome: string;
  otherIncomeDescription: string;
  incomeFrequency: string;
  incomeStability: string;
  selfEmployed: "yes" | "no";
  businessFinancialsAvailable: "yes" | "no";

  loanPurpose: string;
  purchasePrice: string;
  requestedLoanAmount: string;
  downPaymentAvailable: string;
  downPaymentSource: string;
  loanTermYears: string;
  annualRate: string;
  propertyType: string;
  propertyLocation: string;
  propertyIdentified: "yes" | "no";
  purchaseAgreementAvailable: "yes" | "no";

  rentOrOwn: string;
  currentHousingPayment: string;
  monthlyLivingExpenses: string;
  currentMortgageBalance: string;
  estimatedHomeValue: string;

  creditCardBalance: string;
  creditCardMonthlyPayment: string;
  personalLoanBalance: string;
  personalLoanMonthlyPayment: string;
  autoLoanBalance: string;
  autoLoanMonthlyPayment: string;
  otherDebtBalance: string;
  otherDebtMonthlyPayment: string;

  cashSavings: string;
  emergencyFund: string;
  investments: string;
  retirementSavings: string;
  downPaymentSavings: string;
  otherAssets: string;

  creditProfileKnown: "yes" | "no";
  creditScoreProfile: string;
  primaryBankName: string;
  existingBankRelationship: "yes" | "no";
  bankStatementsAvailable: "yes" | "no";
  missedPayments: "yes" | "no";
  bankruptcyHistory: "yes" | "no";

  docId: boolean;
  docProofOfAddress: boolean;
  docPayslips: boolean;
  docEmploymentLetter: boolean;
  docBankStatements: boolean;
  docDebtStatements: boolean;
  docCreditReport: boolean;
  docPurchaseAgreement: boolean;
  docPropertyValuation: boolean;
  docProofDownPayment: boolean;
  docBusinessFinancials: boolean;
};

const initialForm: PrequalForm = {
  fullName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  dateOfBirth: "",
  countryMarket: "",
  residentialAddress: "",
  mailingAddress: "",
  nationality: "",
  citizenshipStatus: "",
  workPermitRequired: "no",
  workPermitExpiry: "",

  employmentStatus: "",
  employerBusinessName: "",
  employerAddress: "",
  jobTitle: "",
  lengthOfEmployment: "",
  monthlyGrossIncome: "",
  monthlyNetIncome: "",
  otherIncome: "",
  otherIncomeDescription: "",
  incomeFrequency: "",
  incomeStability: "",
  selfEmployed: "no",
  businessFinancialsAvailable: "no",

  loanPurpose: "",
  purchasePrice: "",
  requestedLoanAmount: "",
  downPaymentAvailable: "",
  downPaymentSource: "",
  loanTermYears: "30",
  annualRate: "7",
  propertyType: "",
  propertyLocation: "",
  propertyIdentified: "no",
  purchaseAgreementAvailable: "no",

  rentOrOwn: "",
  currentHousingPayment: "",
  monthlyLivingExpenses: "",
  currentMortgageBalance: "",
  estimatedHomeValue: "",

  creditCardBalance: "",
  creditCardMonthlyPayment: "",
  personalLoanBalance: "",
  personalLoanMonthlyPayment: "",
  autoLoanBalance: "",
  autoLoanMonthlyPayment: "",
  otherDebtBalance: "",
  otherDebtMonthlyPayment: "",

  cashSavings: "",
  emergencyFund: "",
  investments: "",
  retirementSavings: "",
  downPaymentSavings: "",
  otherAssets: "",

  creditProfileKnown: "no",
  creditScoreProfile: "",
  primaryBankName: "",
  existingBankRelationship: "no",
  bankStatementsAvailable: "no",
  missedPayments: "no",
  bankruptcyHistory: "no",

  docId: false,
  docProofOfAddress: false,
  docPayslips: false,
  docEmploymentLetter: false,
  docBankStatements: false,
  docDebtStatements: false,
  docCreditReport: false,
  docPurchaseAgreement: false,
  docPropertyValuation: false,
  docProofDownPayment: false,
  docBusinessFinancials: false
};

const REQUIRED_FIELDS: Array<keyof PrequalForm> = [
  "fullName", "email", "phone", "countryMarket", "residentialAddress", "nationality", "citizenshipStatus",
  "employmentStatus", "employerBusinessName", "jobTitle", "monthlyNetIncome", "loanPurpose", "requestedLoanAmount",
  "propertyType", "propertyLocation", "loanTermYears"
];

const PROFILE_CONTROLLED_FIELDS = new Set<keyof PrequalForm>([
  "fullName", "phone", "alternatePhone", "dateOfBirth", "countryMarket", "residentialAddress", "mailingAddress", "nationality", "citizenshipStatus", "workPermitRequired", "workPermitExpiry",
  "employmentStatus", "employerBusinessName", "employerAddress", "jobTitle", "lengthOfEmployment", "monthlyGrossIncome", "monthlyNetIncome", "otherIncome", "otherIncomeDescription", "loanPurpose",
  "requestedLoanAmount", "loanTermYears", "propertyType", "propertyLocation", "propertyIdentified", "purchaseAgreementAvailable", "primaryBankName", "existingBankRelationship", "bankStatementsAvailable",
  "missedPayments", "bankruptcyHistory", "docId", "docProofOfAddress", "docPayslips", "docEmploymentLetter", "docBankStatements", "docDebtStatements", "docCreditReport", "docPurchaseAgreement",
  "docPropertyValuation", "docProofDownPayment", "docBusinessFinancials"
]);

const toNumber = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const toYesNo = (value: unknown): "yes" | "no" => (value === true || String(value).toLowerCase() === "true" ? "yes" : "no");

function calcMortgagePayment(loanAmount: number, annualRate: number, termYears: number) {
  const monthlyRate = annualRate / 100 / 12;
  const months = termYears * 12;
  if (loanAmount <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return loanAmount / months;
  return (loanAmount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

function Field({ label, value, onChange, type = "text", required = false, locked = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; locked?: boolean }) {
  const missing = required && String(value).trim() === "";
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label} {required ? <span className="text-red-600">*</span> : null}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={locked}
        className={`w-full rounded-lg border px-3 py-2 ${missing ? "border-red-300 bg-red-50" : "border-slate-300"} ${locked ? "bg-slate-100 text-slate-600" : ""}`}
      />
      {missing && locked ? <p className="mt-1 text-xs text-red-600">Complete in Profile</p> : null}
    </label>
  );
}

function SelectField({ label, value, onChange, options, locked = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; locked?: boolean }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={locked} className={`w-full rounded-lg border border-slate-300 px-3 py-2 ${locked ? "bg-slate-100 text-slate-600" : ""}`}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {locked && !value ? <p className="mt-1 text-xs text-red-600">Complete in Profile</p> : null}
    </label>
  );
}

function YesNoField({ label, value, onChange, locked = false }: { label: string; value: "yes" | "no"; onChange: (value: "yes" | "no") => void; locked?: boolean }) {
  return <SelectField label={label} value={value} onChange={(value) => onChange(value === "yes" ? "yes" : "no")} options={["yes", "no"]} locked={locked} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-semibold tracking-wide text-[#0A2540]">{title}</h2><div className="grid gap-3 md:grid-cols-2">{children}</div></section>;
}

export default function ProvenBankPrequalificationPage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PrequalForm>(initialForm);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getUser();
        if (!user) return;
        const token = await getIdentityToken(user);
        if (!token) return;

        const response = await fetch("/.netlify/functions/profile-get", { method: "GET", credentials: "same-origin", headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return;

        const payload = (await response.json()) as SavedOnboardingData;
        const profile = payload.profile ?? {};
        const expenseProfile = payload.expenseProfile ?? {};
        const debts = payload.debts ?? [];
        const income = payload.incomeSources?.[0] ?? {};
        const housing = payload.housingProfile ?? {};
        const savings = payload.savingsProfile ?? {};
        const goals = payload.goals ?? {};

        const debtPayments = debts.reduce<number>((sum, debt) => sum + toNumber(String(debt.monthly_payment ?? "0")), 0);
        const nonDebtExpense = [expenseProfile.housing, expenseProfile.utilities, expenseProfile.transport, expenseProfile.groceries, expenseProfile.insurance, expenseProfile.childcare, expenseProfile.discretionary, expenseProfile.other]
          .reduce<number>((sum, item) => sum + toNumber(String(item ?? "0")), 0);

        setForm((prev) => ({
          ...prev,
          fullName: String(profile.customer_name ?? ""),
          email: user.email ?? "",
          phone: String(profile.phone ?? ""),
          alternatePhone: String(profile.alternate_phone ?? ""),
          dateOfBirth: String(profile.date_of_birth ?? ""),
          countryMarket: String(profile.country_or_market ?? ""),
          residentialAddress: String(profile.physical_address ?? ""),
          mailingAddress: String(profile.mailing_address ?? ""),
          nationality: String(profile.nationality ?? ""),
          citizenshipStatus: String(profile.citizenship_status ?? ""),
          workPermitRequired: toYesNo(profile.work_permit_required),
          workPermitExpiry: String(profile.work_permit_expiry_date ?? ""),
          employmentStatus: String(profile.employment_type ?? ""),
          employerBusinessName: String(profile.employer ?? ""),
          employerAddress: String(profile.employer_address ?? ""),
          jobTitle: String(profile.job_title ?? ""),
          lengthOfEmployment: String(profile.employment_length ?? ""),
          monthlyGrossIncome: String(profile.monthly_gross_income ?? ""),
          monthlyNetIncome: String(profile.monthly_net_income ?? income.monthly_amount ?? ""),
          otherIncome: String(profile.other_income_amount ?? ""),
          otherIncomeDescription: String(profile.other_income_description ?? ""),
          incomeFrequency: String(income.frequency ?? ""),
          incomeStability: String(income.stability ?? ""),
          selfEmployed: String(profile.employment_type ?? "").toLowerCase().includes("self") ? "yes" : "no",
          businessFinancialsAvailable: toYesNo(profile.has_business_financials),
          loanPurpose: String(profile.loan_purpose ?? goals.target_goal ?? ""),
          purchasePrice: String(goals.target_home_price ?? ""),
          requestedLoanAmount: String(profile.requested_loan_amount ?? ""),
          downPaymentAvailable: String(savings.down_payment_savings ?? ""),
          loanTermYears: String(profile.desired_loan_term_years ?? "30"),
          propertyType: String(profile.property_type ?? ""),
          propertyLocation: String(profile.property_location ?? ""),
          propertyIdentified: toYesNo(profile.property_identified),
          purchaseAgreementAvailable: toYesNo(profile.purchase_agreement_available),
          rentOrOwn: String(housing.housing_status ?? ""),
          currentHousingPayment: String(housing.mortgage_payment ?? housing.rent_amount ?? ""),
          monthlyLivingExpenses: String(nonDebtExpense || ""),
          currentMortgageBalance: String(housing.mortgage_balance ?? ""),
          estimatedHomeValue: String(housing.estimated_home_value ?? ""),
          otherDebtMonthlyPayment: String(debtPayments || ""),
          cashSavings: String(savings.cash_savings ?? ""),
          emergencyFund: String(savings.emergency_fund ?? ""),
          investments: String(savings.investments ?? ""),
          retirementSavings: String(savings.retirement_savings ?? ""),
          downPaymentSavings: String(savings.down_payment_savings ?? ""),
          primaryBankName: String(profile.primary_bank_name ?? ""),
          existingBankRelationship: toYesNo(profile.existing_bank_relationship),
          bankStatementsAvailable: toYesNo(profile.bank_statements_available),
          missedPayments: toYesNo(profile.missed_payments_history),
          bankruptcyHistory: toYesNo(profile.bankruptcy_history),
          docId: Boolean(profile.has_id),
          docProofOfAddress: Boolean(profile.has_proof_of_address),
          docPayslips: Boolean(profile.has_payslips),
          docEmploymentLetter: Boolean(profile.has_employment_letter),
          docBankStatements: Boolean(profile.has_bank_statements),
          docDebtStatements: Boolean(profile.has_debt_statements),
          docCreditReport: Boolean(profile.has_credit_report),
          docPurchaseAgreement: Boolean(profile.has_purchase_agreement),
          docPropertyValuation: Boolean(profile.has_valuation),
          docProofDownPayment: Boolean(profile.has_down_payment_proof),
          docBusinessFinancials: Boolean(profile.has_business_financials)
        }));
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, []);

  const calculations = useMemo(() => {
    const monthlyIncome = toNumber(form.monthlyNetIncome) + toNumber(form.otherIncome);
    const monthlyExpenses = toNumber(form.monthlyLivingExpenses) + toNumber(form.currentHousingPayment);
    const monthlyDebtPayments = toNumber(form.creditCardMonthlyPayment) + toNumber(form.personalLoanMonthlyPayment) + toNumber(form.autoLoanMonthlyPayment) + toNumber(form.otherDebtMonthlyPayment);
    const proposedMortgagePayment = calcMortgagePayment(toNumber(form.requestedLoanAmount), toNumber(form.annualRate), toNumber(form.loanTermYears));
    const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
    const debtToIncome = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
    const housingRatio = monthlyIncome > 0 ? proposedMortgagePayment / monthlyIncome : 0;
    const downPaymentPercent = toNumber(form.purchasePrice) > 0 ? toNumber(form.downPaymentAvailable) / toNumber(form.purchasePrice) : 0;
    const loanToValue = toNumber(form.purchasePrice) > 0 ? toNumber(form.requestedLoanAmount) / toNumber(form.purchasePrice) : 0;
    const liquidSavings = toNumber(form.cashSavings) + toNumber(form.emergencyFund) + toNumber(form.downPaymentSavings);
    const expenseBase = monthlyExpenses + monthlyDebtPayments;
    const savingsRunwayMonths = expenseBase > 0 ? liquidSavings / expenseBase : 0;
    return { monthlyIncome, monthlyExpenses, monthlyDebtPayments, monthlySurplus, proposedMortgagePayment, debtToIncome, housingRatio, downPaymentPercent, loanToValue, savingsRunwayMonths };
  }, [form]);

  const missingRequired = useMemo(() => REQUIRED_FIELDS.filter((field) => String(form[field] ?? "").trim() === ""), [form]);
  const documentGaps = useMemo(() => {
    const docs: Array<[boolean, string]> = [[form.docId, "Government ID"], [form.docProofOfAddress, "Proof of address"], [form.docPayslips, "Payslips"], [form.docEmploymentLetter, "Employment letter"], [form.docBankStatements, "Bank statements"], [form.docDebtStatements, "Debt statements"], [form.docCreditReport, "Credit report"], [form.docPurchaseAgreement, "Purchase agreement"], [form.docPropertyValuation, "Property valuation"], [form.docProofDownPayment, "Proof of down payment"]];
    if (form.selfEmployed === "yes") docs.push([form.docBusinessFinancials || form.businessFinancialsAvailable === "yes", "Business financials"]);
    return docs.filter(([available]) => !available).map(([, name]) => name);
  }, [form]);

  const readiness = useMemo(() => {
    const hasIncome = calculations.monthlyIncome > 0;
    const hasDownPayment = toNumber(form.downPaymentAvailable) > 0;
    const hasCoreDocs = form.docId && form.docProofOfAddress;
    const dti = calculations.debtToIncome;
    if (!hasIncome || calculations.monthlySurplus < 0 || !hasDownPayment || dti > 0.5) return "Not Ready Yet" as const;
    if (hasIncome && dti < 0.4 && hasDownPayment && calculations.monthlySurplus > 0 && form.bankStatementsAvailable === "yes" && hasCoreDocs) return "Likely Ready" as const;
    if ((dti >= 0.4 && dti <= 0.5) || calculations.savingsRunwayMonths < 3 || documentGaps.length > 0) return "Needs Review" as const;
    return "Needs Review" as const;
  }, [calculations, documentGaps.length, form]);

  const completion = Math.round(((REQUIRED_FIELDS.length - missingRequired.length) / REQUIRED_FIELDS.length) * 100);
  const summary = `Proven Bank prequalification status: ${readiness}. Monthly income ${currency(calculations.monthlyIncome)}, expenses ${currency(calculations.monthlyExpenses)}, debt payments ${currency(calculations.monthlyDebtPayments)}, surplus ${currency(calculations.monthlySurplus)}. DTI ${percent(calculations.debtToIncome)}, housing ratio ${percent(calculations.housingRatio)}, down payment ${percent(calculations.downPaymentPercent)}, LTV ${percent(calculations.loanToValue)}.`;
  const setString = (field: keyof PrequalForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const locked = (field: keyof PrequalForm) => PROFILE_CONTROLLED_FIELDS.has(field);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading prequalification profile...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0A2540] bg-[#0A2540] p-6 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Proven Bank</p>
        <h1 className="mt-2 text-2xl font-semibold">Mortgage Prequalification Questionnaire</h1>
        <div className="mt-4 max-w-xl"><div className="mb-1 flex items-center justify-between text-xs text-blue-100"><span>Completion</span><span>{completion}%</span></div><div className="h-2 overflow-hidden rounded-full bg-blue-900/60"><div className="h-full bg-emerald-400" style={{ width: `${completion}%` }} /></div></div>
      </div>

      <Section title="A. Applicant Information">
        <Field label="Full name" value={form.fullName} onChange={setString("fullName")} required locked={locked("fullName")} />
        <Field label="Email" value={form.email} onChange={setString("email")} required type="email" />
        <Field label="Phone" value={form.phone} onChange={setString("phone")} required locked={locked("phone")} />
        <Field label="Alternate phone" value={form.alternatePhone} onChange={setString("alternatePhone")} locked={locked("alternatePhone")} />
        <Field label="Date of birth" value={form.dateOfBirth} onChange={setString("dateOfBirth")} locked={locked("dateOfBirth")} />
        <Field label="Country / market" value={form.countryMarket} onChange={setString("countryMarket")} required locked={locked("countryMarket")} />
        <Field label="Residential address" value={form.residentialAddress} onChange={setString("residentialAddress")} required locked={locked("residentialAddress")} />
        <Field label="Mailing address" value={form.mailingAddress} onChange={setString("mailingAddress")} locked={locked("mailingAddress")} />
        <Field label="Nationality" value={form.nationality} onChange={setString("nationality")} required locked={locked("nationality")} />
        <SelectField label="Citizenship / residency status" value={form.citizenshipStatus} onChange={setString("citizenshipStatus")} options={["citizen", "permanent resident", "work permit"]} locked={locked("citizenshipStatus")} />
        <YesNoField label="Work permit required?" value={form.workPermitRequired} onChange={(value) => setForm((prev) => ({ ...prev, workPermitRequired: value }))} locked={locked("workPermitRequired")} />
        <Field label="Work permit expiry date" value={form.workPermitExpiry} onChange={setString("workPermitExpiry")} locked={locked("workPermitExpiry")} />
      </Section>

      <Section title="B. Employment & Income">
        <Field label="Employment status" value={form.employmentStatus} onChange={setString("employmentStatus")} required locked={locked("employmentStatus")} />
        <Field label="Employer / business name" value={form.employerBusinessName} onChange={setString("employerBusinessName")} required locked={locked("employerBusinessName")} />
        <Field label="Employer address" value={form.employerAddress} onChange={setString("employerAddress")} locked={locked("employerAddress")} />
        <Field label="Job title" value={form.jobTitle} onChange={setString("jobTitle")} required locked={locked("jobTitle")} />
        <Field label="Length of employment" value={form.lengthOfEmployment} onChange={setString("lengthOfEmployment")} locked={locked("lengthOfEmployment")} />
        <Field label="Monthly gross income" value={form.monthlyGrossIncome} onChange={setString("monthlyGrossIncome")} type="number" locked={locked("monthlyGrossIncome")} />
        <Field label="Monthly net income" value={form.monthlyNetIncome} onChange={setString("monthlyNetIncome")} type="number" required locked={locked("monthlyNetIncome")} />
        <Field label="Other income" value={form.otherIncome} onChange={setString("otherIncome")} type="number" locked={locked("otherIncome")} />
        <Field label="Other income description" value={form.otherIncomeDescription} onChange={setString("otherIncomeDescription")} locked={locked("otherIncomeDescription")} />
        <Field label="Income frequency" value={form.incomeFrequency} onChange={setString("incomeFrequency")} />
        <Field label="Income stability" value={form.incomeStability} onChange={setString("incomeStability")} />
      </Section>

      <Section title="C. Property / Loan Request">
        <Field label="Loan purpose" value={form.loanPurpose} onChange={setString("loanPurpose")} required locked={locked("loanPurpose")} />
        <Field label="Property purchase price" value={form.purchasePrice} onChange={setString("purchasePrice")} type="number" />
        <Field label="Requested loan amount" value={form.requestedLoanAmount} onChange={setString("requestedLoanAmount")} type="number" required locked={locked("requestedLoanAmount")} />
        <Field label="Down payment available" value={form.downPaymentAvailable} onChange={setString("downPaymentAvailable")} type="number" />
        <Field label="Source of down payment" value={form.downPaymentSource} onChange={setString("downPaymentSource")} />
        <Field label="Loan term desired (years)" value={form.loanTermYears} onChange={setString("loanTermYears")} type="number" required locked={locked("loanTermYears")} />
        <Field label="Estimated annual interest rate (%)" value={form.annualRate} onChange={setString("annualRate")} type="number" />
        <Field label="Property type" value={form.propertyType} onChange={setString("propertyType")} required locked={locked("propertyType")} />
        <Field label="Property location" value={form.propertyLocation} onChange={setString("propertyLocation")} required locked={locked("propertyLocation")} />
        <YesNoField label="Property already identified?" value={form.propertyIdentified} onChange={(value) => setForm((prev) => ({ ...prev, propertyIdentified: value }))} locked={locked("propertyIdentified")} />
        <YesNoField label="Purchase agreement available?" value={form.purchaseAgreementAvailable} onChange={(value) => setForm((prev) => ({ ...prev, purchaseAgreementAvailable: value }))} locked={locked("purchaseAgreementAvailable")} />
      </Section>

      <Section title="D. Existing Housing">
        <Field label="Rent / own" value={form.rentOrOwn} onChange={setString("rentOrOwn")} />
        <Field label="Current rent or mortgage payment" value={form.currentHousingPayment} onChange={setString("currentHousingPayment")} type="number" />
        <Field label="Monthly living expenses (non-debt)" value={form.monthlyLivingExpenses} onChange={setString("monthlyLivingExpenses")} type="number" />
        <Field label="Current mortgage balance" value={form.currentMortgageBalance} onChange={setString("currentMortgageBalance")} type="number" />
        <Field label="Estimated home value" value={form.estimatedHomeValue} onChange={setString("estimatedHomeValue")} type="number" />
      </Section>

      <Section title="E. Debts & Liabilities">
        <Field label="Credit card balance" value={form.creditCardBalance} onChange={setString("creditCardBalance")} type="number" />
        <Field label="Credit card monthly payment" value={form.creditCardMonthlyPayment} onChange={setString("creditCardMonthlyPayment")} type="number" />
        <Field label="Personal loan balance" value={form.personalLoanBalance} onChange={setString("personalLoanBalance")} type="number" />
        <Field label="Personal loan monthly payment" value={form.personalLoanMonthlyPayment} onChange={setString("personalLoanMonthlyPayment")} type="number" />
        <Field label="Auto loan balance" value={form.autoLoanBalance} onChange={setString("autoLoanBalance")} type="number" />
        <Field label="Auto loan monthly payment" value={form.autoLoanMonthlyPayment} onChange={setString("autoLoanMonthlyPayment")} type="number" />
        <Field label="Other debt balance" value={form.otherDebtBalance} onChange={setString("otherDebtBalance")} type="number" />
        <Field label="Other debt monthly payment" value={form.otherDebtMonthlyPayment} onChange={setString("otherDebtMonthlyPayment")} type="number" />
      </Section>

      <Section title="F. Assets & Savings">
        <Field label="Cash savings" value={form.cashSavings} onChange={setString("cashSavings")} type="number" />
        <Field label="Emergency fund" value={form.emergencyFund} onChange={setString("emergencyFund")} type="number" />
        <Field label="Investments" value={form.investments} onChange={setString("investments")} type="number" />
        <Field label="Retirement savings" value={form.retirementSavings} onChange={setString("retirementSavings")} type="number" />
        <Field label="Down payment savings" value={form.downPaymentSavings} onChange={setString("downPaymentSavings")} type="number" />
        <Field label="Other assets" value={form.otherAssets} onChange={setString("otherAssets")} type="number" />
      </Section>

      <Section title="G. Credit & Banking">
        <Field label="Primary bank name" value={form.primaryBankName} onChange={setString("primaryBankName")} locked={locked("primaryBankName")} />
        <YesNoField label="Existing bank relationship" value={form.existingBankRelationship} onChange={(value) => setForm((prev) => ({ ...prev, existingBankRelationship: value }))} locked={locked("existingBankRelationship")} />
        <YesNoField label="Credit profile known?" value={form.creditProfileKnown} onChange={(value) => setForm((prev) => ({ ...prev, creditProfileKnown: value }))} />
        <Field label="Credit score/profile" value={form.creditScoreProfile} onChange={setString("creditScoreProfile")} />
        <YesNoField label="Bank statements available?" value={form.bankStatementsAvailable} onChange={(value) => setForm((prev) => ({ ...prev, bankStatementsAvailable: value }))} locked={locked("bankStatementsAvailable")} />
        <YesNoField label="Any missed payments?" value={form.missedPayments} onChange={(value) => setForm((prev) => ({ ...prev, missedPayments: value }))} locked={locked("missedPayments")} />
        <YesNoField label="Bankruptcy history?" value={form.bankruptcyHistory} onChange={(value) => setForm((prev) => ({ ...prev, bankruptcyHistory: value }))} locked={locked("bankruptcyHistory")} />
      </Section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#0A2540]">H. Documents Checklist</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["docId", "ID"], ["docProofOfAddress", "Proof of address"], ["docPayslips", "Payslips"], ["docEmploymentLetter", "Employment letter"], ["docBankStatements", "Bank statements"], ["docDebtStatements", "Debt statements"], ["docCreditReport", "Credit report"], ["docPurchaseAgreement", "Purchase agreement"], ["docPropertyValuation", "Property valuation"], ["docProofDownPayment", "Proof of down payment"], ["docBusinessFinancials", "Business financials (if self-employed)"]
          ] as const).map(([field, label]) => {
            const typedField = field as keyof PrequalForm;
            const isLocked = locked(typedField);
            return (
              <label key={field} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(form[typedField])} disabled={isLocked} onChange={(event) => setForm((prev) => ({ ...prev, [typedField]: event.target.checked }))} />
                {label}
              </label>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold tracking-wide text-[#0A2540]">Prequalification Summary</h2>
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{summary}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 px-3 py-2">Status: <span className="font-semibold">{readiness}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Estimated mortgage payment: <span className="font-semibold">{currency(calculations.proposedMortgagePayment)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Monthly income: <span className="font-semibold">{currency(calculations.monthlyIncome)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Monthly expenses: <span className="font-semibold">{currency(calculations.monthlyExpenses)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Monthly debt payments: <span className="font-semibold">{currency(calculations.monthlyDebtPayments)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Monthly surplus: <span className="font-semibold">{currency(calculations.monthlySurplus)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">DTI: <span className="font-semibold">{percent(calculations.debtToIncome)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Housing ratio: <span className="font-semibold">{percent(calculations.housingRatio)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Down payment %: <span className="font-semibold">{percent(calculations.downPaymentPercent)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Loan-to-value: <span className="font-semibold">{percent(calculations.loanToValue)}</span></div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">Savings runway: <span className="font-semibold">{calculations.savingsRunwayMonths.toFixed(1)} months</span></div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold tracking-wide text-[#0A2540]">Readiness Details</h2>
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing information</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {missingRequired.length ? missingRequired.map((item) => <li key={item}>{item}</li>) : <li>Required fields complete.</li>}
            </ul>
            {missingRequired.length ? <p className="mt-2 text-sm text-red-700">Complete in Profile: <Link href="/app/onboarding" className="font-semibold underline">/app/onboarding</Link></p> : null}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents to collect</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {documentGaps.length ? documentGaps.map((item) => <li key={item}>{item}</li>) : <li>Document checklist complete.</li>}
            </ul>
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Suggested next steps: complete missing profile fields/documents and then submit for underwriter review.
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Print / Save as PDF</button>
            <button type="button" onClick={async () => navigator.clipboard.writeText(summary)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Copy Prequalification Summary</button>
          </div>
        </section>
      </div>
    </div>
  );
}
