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
  dateOfBirth: string;
  countryMarket: string;
  residentialAddress: string;
  citizenshipStatus: string;
  workPermitRequired: "yes" | "no";
  workPermitExpiry: string;

  employmentStatus: string;
  employerBusinessName: string;
  jobTitle: string;
  lengthOfEmployment: string;
  monthlyGrossIncome: string;
  monthlyNetIncome: string;
  otherIncome: string;
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
  existingBankRelationship: string;
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
  dateOfBirth: "",
  countryMarket: "",
  residentialAddress: "",
  citizenshipStatus: "",
  workPermitRequired: "no",
  workPermitExpiry: "",

  employmentStatus: "",
  employerBusinessName: "",
  jobTitle: "",
  lengthOfEmployment: "",
  monthlyGrossIncome: "",
  monthlyNetIncome: "",
  otherIncome: "",
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
  existingBankRelationship: "",
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
  "fullName",
  "email",
  "phone",
  "countryMarket",
  "residentialAddress",
  "employmentStatus",
  "monthlyNetIncome",
  "purchasePrice",
  "requestedLoanAmount",
  "downPaymentAvailable",
  "loanTermYears",
  "annualRate",
  "propertyType",
  "propertyLocation"
];

const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function calcMortgagePayment(loanAmount: number, annualRate: number, termYears: number) {
  const monthlyRate = annualRate / 100 / 12;
  const months = termYears * 12;
  if (loanAmount <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return loanAmount / months;
  return (loanAmount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  const missing = required && String(value).trim() === "";
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label} {required ? <span className="text-red-600">*</span> : null}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2 ${missing ? "border-red-300 bg-red-50" : "border-slate-300"}`} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function YesNoField({ label, value, onChange }: { label: string; value: "yes" | "no"; onChange: (value: "yes" | "no") => void }) {
  return <SelectField label={label} value={value} onChange={(value) => onChange(value === "yes" ? "yes" : "no")} options={["yes", "no"]} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#0A2540]">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ProvenBankPrequalificationPage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PrequalForm>(initialForm);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const token = await getIdentityToken(user);
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch("/.netlify/functions/profile-get", {
          method: "GET",
          credentials: "same-origin",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          setLoading(false);
          return;
        }

        const payload = (await response.json()) as SavedOnboardingData;
        const expenseProfile = payload.expenseProfile ?? {};
        const debts = payload.debts ?? [];
        const income = payload.incomeSources?.[0] ?? {};
        const housing = payload.housingProfile ?? {};
        const savings = payload.savingsProfile ?? {};
        const profile = payload.profile ?? {};
        const goals = payload.goals ?? {};

        const debtPayments = debts.reduce<number>((sum, debt) => sum + toNumber(String(debt.monthly_payment ?? "0")), 0);
        const nonDebtExpense = [
          expenseProfile.housing,
          expenseProfile.utilities,
          expenseProfile.transport,
          expenseProfile.groceries,
          expenseProfile.insurance,
          expenseProfile.childcare,
          expenseProfile.discretionary,
          expenseProfile.other
        ].reduce<number>((sum, item) => sum + toNumber(String(item ?? "0")), 0);

        setForm((prev) => ({
          ...prev,
          fullName: String(profile.customer_name ?? ""),
          email: user.email ?? "",
          phone: String(profile.phone ?? ""),
          dateOfBirth: String(profile.date_of_birth ?? ""),
          countryMarket: String(profile.country_or_market ?? ""),
          residentialAddress: String(profile.physical_address ?? ""),
          employmentStatus: String(profile.employment_type ?? ""),
          employerBusinessName: String(profile.employer ?? ""),
          jobTitle: String(profile.job_title ?? ""),
          monthlyNetIncome: String(income.monthly_amount ?? ""),
          incomeFrequency: String(income.frequency ?? ""),
          incomeStability: String(income.stability ?? ""),
          purchasePrice: String(goals.target_home_price ?? ""),
          downPaymentSavings: String(savings.down_payment_savings ?? ""),
          downPaymentAvailable: String(savings.down_payment_savings ?? ""),
          currentHousingPayment: String(housing.mortgage_payment ?? housing.rent_amount ?? ""),
          currentMortgageBalance: String(housing.mortgage_balance ?? ""),
          estimatedHomeValue: String(housing.estimated_home_value ?? ""),
          monthlyLivingExpenses: String(nonDebtExpense || ""),
          otherDebtMonthlyPayment: String(debtPayments || ""),
          cashSavings: String(savings.cash_savings ?? ""),
          emergencyFund: String(savings.emergency_fund ?? ""),
          investments: String(savings.investments ?? ""),
          retirementSavings: String(savings.retirement_savings ?? "")
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
    const monthlyDebtPayments =
      toNumber(form.creditCardMonthlyPayment) +
      toNumber(form.personalLoanMonthlyPayment) +
      toNumber(form.autoLoanMonthlyPayment) +
      toNumber(form.otherDebtMonthlyPayment);

    const proposedMortgagePayment = calcMortgagePayment(toNumber(form.requestedLoanAmount), toNumber(form.annualRate), toNumber(form.loanTermYears));
    const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebtPayments;

    const debtToIncome = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
    const housingRatio = monthlyIncome > 0 ? proposedMortgagePayment / monthlyIncome : 0;
    const downPaymentPercent = toNumber(form.purchasePrice) > 0 ? toNumber(form.downPaymentAvailable) / toNumber(form.purchasePrice) : 0;
    const loanToValue = toNumber(form.purchasePrice) > 0 ? toNumber(form.requestedLoanAmount) / toNumber(form.purchasePrice) : 0;

    const liquidSavings = toNumber(form.cashSavings) + toNumber(form.emergencyFund) + toNumber(form.downPaymentSavings);
    const expenseBase = monthlyExpenses + monthlyDebtPayments;
    const savingsRunwayMonths = expenseBase > 0 ? liquidSavings / expenseBase : 0;

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments,
      monthlySurplus,
      proposedMortgagePayment,
      debtToIncome,
      housingRatio,
      downPaymentPercent,
      loanToValue,
      savingsRunwayMonths
    };
  }, [form]);

  const missingRequired = useMemo(
    () => REQUIRED_FIELDS.filter((field) => String(form[field] ?? "").trim() === ""),
    [form]
  );

  const documentGaps = useMemo(() => {
    const docs: Array<[boolean, string]> = [
      [form.docId, "Government ID"],
      [form.docProofOfAddress, "Proof of address"],
      [form.docPayslips, "Payslips"],
      [form.docEmploymentLetter, "Employment letter"],
      [form.docBankStatements, "Bank statements"],
      [form.docDebtStatements, "Debt statements"],
      [form.docCreditReport, "Credit report"],
      [form.docPurchaseAgreement, "Purchase agreement"],
      [form.docPropertyValuation, "Property valuation"],
      [form.docProofDownPayment, "Proof of down payment"]
    ];

    if (form.selfEmployed === "yes") docs.push([form.docBusinessFinancials || form.businessFinancialsAvailable === "yes", "Business financials"]);

    return docs.filter(([available]) => !available).map(([, name]) => name);
  }, [form]);

  const readiness = useMemo(() => {
    const hasIncome = calculations.monthlyIncome > 0;
    const hasDownPayment = toNumber(form.downPaymentAvailable) > 0;
    const hasCoreDocs = form.docId && form.docProofOfAddress;
    const dti = calculations.debtToIncome;

    if (!hasIncome || calculations.monthlySurplus < 0 || !hasDownPayment || dti > 0.5) {
      return "Not Ready Yet" as const;
    }

    if (hasIncome && dti < 0.4 && hasDownPayment && calculations.monthlySurplus > 0 && form.bankStatementsAvailable === "yes" && hasCoreDocs) {
      return "Likely Ready" as const;
    }

    if ((dti >= 0.4 && dti <= 0.5) || calculations.savingsRunwayMonths < 3 || documentGaps.length > 0) {
      return "Needs Review" as const;
    }

    return "Needs Review" as const;
  }, [calculations, documentGaps.length, form]);

  const completion = Math.round(((REQUIRED_FIELDS.length - missingRequired.length) / REQUIRED_FIELDS.length) * 100);

  const strengths = [
    calculations.monthlySurplus > 0 ? `Positive monthly surplus (${currency(calculations.monthlySurplus)}).` : "",
    calculations.debtToIncome < 0.4 ? `Debt-to-income is ${percent(calculations.debtToIncome)}.` : "",
    toNumber(form.downPaymentAvailable) > 0 ? `Down payment available (${currency(toNumber(form.downPaymentAvailable))}).` : "",
    form.bankStatementsAvailable === "yes" ? "Bank statements are available." : ""
  ].filter(Boolean);

  const riskAreas = [
    calculations.debtToIncome > 0.5 ? `DTI is high at ${percent(calculations.debtToIncome)}.` : "",
    calculations.monthlySurplus < 0 ? "Monthly surplus is negative." : "",
    calculations.savingsRunwayMonths < 3 ? `Savings runway is low (${calculations.savingsRunwayMonths.toFixed(1)} months).` : "",
    toNumber(form.downPaymentAvailable) <= 0 ? "No down payment entered." : ""
  ].filter(Boolean);

  const summary = `Proven Bank prequalification status: ${readiness}. Monthly income ${currency(calculations.monthlyIncome)}, expenses ${currency(calculations.monthlyExpenses)}, debt payments ${currency(calculations.monthlyDebtPayments)}, surplus ${currency(calculations.monthlySurplus)}. DTI ${percent(calculations.debtToIncome)}, housing ratio ${percent(calculations.housingRatio)}, down payment ${percent(calculations.downPaymentPercent)}, LTV ${percent(calculations.loanToValue)}.`;

  const setString = (field: keyof PrequalForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading prequalification profile...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0A2540] bg-[#0A2540] p-6 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Proven Bank</p>
        <h1 className="mt-2 text-2xl font-semibold">Mortgage Prequalification Questionnaire</h1>
        <div className="mt-4 max-w-xl">
          <div className="mb-1 flex items-center justify-between text-xs text-blue-100">
            <span>Completion</span>
            <span>{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-900/60">
            <div className="h-full bg-emerald-400" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      <Section title="A. Applicant Information">
        <Field label="Full name" value={form.fullName} onChange={setString("fullName")} required />
        <Field label="Email" value={form.email} onChange={setString("email")} required type="email" />
        <Field label="Phone" value={form.phone} onChange={setString("phone")} required />
        <Field label="Date of birth" value={form.dateOfBirth} onChange={setString("dateOfBirth")} />
        <Field label="Country / market" value={form.countryMarket} onChange={setString("countryMarket")} required />
        <Field label="Residential address" value={form.residentialAddress} onChange={setString("residentialAddress")} required />
        <Field label="Citizenship / residency status" value={form.citizenshipStatus} onChange={setString("citizenshipStatus")} />
        <YesNoField label="Work permit required?" value={form.workPermitRequired} onChange={(value) => setForm((prev) => ({ ...prev, workPermitRequired: value }))} />
        <Field label="Work permit expiry date" value={form.workPermitExpiry} onChange={setString("workPermitExpiry")} type="date" />
      </Section>

      <Section title="B. Employment & Income">
        <Field label="Employment status" value={form.employmentStatus} onChange={setString("employmentStatus")} required />
        <Field label="Employer / business name" value={form.employerBusinessName} onChange={setString("employerBusinessName")} />
        <Field label="Job title" value={form.jobTitle} onChange={setString("jobTitle")} />
        <Field label="Length of employment" value={form.lengthOfEmployment} onChange={setString("lengthOfEmployment")} />
        <Field label="Monthly gross income" value={form.monthlyGrossIncome} onChange={setString("monthlyGrossIncome")} type="number" />
        <Field label="Monthly net income" value={form.monthlyNetIncome} onChange={setString("monthlyNetIncome")} type="number" required />
        <Field label="Other income" value={form.otherIncome} onChange={setString("otherIncome")} type="number" />
        <Field label="Income frequency" value={form.incomeFrequency} onChange={setString("incomeFrequency")} />
        <Field label="Income stability" value={form.incomeStability} onChange={setString("incomeStability")} />
        <YesNoField label="Self-employed?" value={form.selfEmployed} onChange={(value) => setForm((prev) => ({ ...prev, selfEmployed: value }))} />
        <YesNoField label="Business financials available?" value={form.businessFinancialsAvailable} onChange={(value) => setForm((prev) => ({ ...prev, businessFinancialsAvailable: value }))} />
      </Section>

      <Section title="C. Property / Loan Request">
        <Field label="Loan purpose" value={form.loanPurpose} onChange={setString("loanPurpose")} />
        <Field label="Property purchase price" value={form.purchasePrice} onChange={setString("purchasePrice")} type="number" required />
        <Field label="Requested loan amount" value={form.requestedLoanAmount} onChange={setString("requestedLoanAmount")} type="number" required />
        <Field label="Down payment available" value={form.downPaymentAvailable} onChange={setString("downPaymentAvailable")} type="number" required />
        <Field label="Source of down payment" value={form.downPaymentSource} onChange={setString("downPaymentSource")} />
        <Field label="Loan term desired (years)" value={form.loanTermYears} onChange={setString("loanTermYears")} type="number" required />
        <Field label="Estimated annual interest rate (%)" value={form.annualRate} onChange={setString("annualRate")} type="number" required />
        <Field label="Property type" value={form.propertyType} onChange={setString("propertyType")} required />
        <Field label="Property location" value={form.propertyLocation} onChange={setString("propertyLocation")} required />
        <YesNoField label="Property already identified?" value={form.propertyIdentified} onChange={(value) => setForm((prev) => ({ ...prev, propertyIdentified: value }))} />
        <YesNoField label="Purchase agreement available?" value={form.purchaseAgreementAvailable} onChange={(value) => setForm((prev) => ({ ...prev, purchaseAgreementAvailable: value }))} />
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
        <YesNoField label="Credit profile known?" value={form.creditProfileKnown} onChange={(value) => setForm((prev) => ({ ...prev, creditProfileKnown: value }))} />
        <Field label="Credit score/profile" value={form.creditScoreProfile} onChange={setString("creditScoreProfile")} />
        <Field label="Existing bank relationship" value={form.existingBankRelationship} onChange={setString("existingBankRelationship")} />
        <YesNoField label="Bank statements available?" value={form.bankStatementsAvailable} onChange={(value) => setForm((prev) => ({ ...prev, bankStatementsAvailable: value }))} />
        <YesNoField label="Any missed payments?" value={form.missedPayments} onChange={(value) => setForm((prev) => ({ ...prev, missedPayments: value }))} />
        <YesNoField label="Bankruptcy history?" value={form.bankruptcyHistory} onChange={(value) => setForm((prev) => ({ ...prev, bankruptcyHistory: value }))} />
      </Section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#0A2540]">H. Documents Checklist</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["docId", "ID"],
            ["docProofOfAddress", "Proof of address"],
            ["docPayslips", "Payslips"],
            ["docEmploymentLetter", "Employment letter"],
            ["docBankStatements", "Bank statements"],
            ["docDebtStatements", "Debt statements"],
            ["docCreditReport", "Credit report"],
            ["docPurchaseAgreement", "Purchase agreement"],
            ["docPropertyValuation", "Property valuation"],
            ["docProofDownPayment", "Proof of down payment"],
            ["docBusinessFinancials", "Business financials (if self-employed)"]
          ].map(([field, label]) => {
            const typedField = field as keyof PrequalForm;
            return (
              <label key={field} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[typedField])}
                  onChange={(event) => setForm((prev) => ({ ...prev, [typedField]: event.target.checked }))}
                />
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strengths</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {strengths.length ? strengths.map((item) => <li key={item}>{item}</li>) : <li>No strengths identified yet.</li>}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk areas</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {riskAreas.length ? riskAreas.map((item) => <li key={item}>{item}</li>) : <li>No risk flags right now.</li>}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing information</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {missingRequired.length ? missingRequired.map((item) => <li key={item}>{item}</li>) : <li>Required fields complete.</li>}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents to collect</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {documentGaps.length ? documentGaps.map((item) => <li key={item}>{item}</li>) : <li>Document checklist complete.</li>}
            </ul>
          </div>

          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Suggested next steps: complete missing fields, upload missing documents, verify debt obligations, and then submit for underwriter review.
            <div className="mt-2">
              Missing profile source data? <Link href="/app/onboarding" className="font-semibold underline">Update profile</Link>
            </div>
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
