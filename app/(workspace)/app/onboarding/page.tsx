"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { describeAuthError, getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import PersonalCard from "@/components/onboarding/PersonalCard";
import ContactCard from "@/components/onboarding/ContactCard";
import IncomeCard from "@/components/onboarding/IncomeCard";
import ExpensesCard from "@/components/onboarding/ExpensesCard";
import HousingCard from "@/components/onboarding/HousingCard";
import DebtCard from "@/components/onboarding/DebtCard";
import SavingsCard from "@/components/onboarding/SavingsCard";
import GoalsCard from "@/components/onboarding/GoalsCard";

type FormDataShape = Record<string, unknown>;
type FormState = Record<string, string | boolean>;

type OnboardingField = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<string | { label: string; value: string | boolean }>;
  showWhen?: ((formData: FormDataShape) => boolean) | { field: string; equals: string | boolean };
  group?: string;
};

type OnboardingSection = {
  key: string;
  title: string;
  description?: string;
  fields: OnboardingField[];
};

const isFieldVisible = (field: OnboardingField, formData: FormDataShape) => {
  if (!field.showWhen) return true;
  if (typeof field.showWhen === "function") return field.showWhen(formData);
  return formData[field.showWhen.field] === field.showWhen.equals;
};

const sections: OnboardingSection[] = [
  { key: "personal", title: "Personal Information", description: "Basic identity details", fields: [{ name: "customerName", label: "Customer name" }, { name: "email", label: "Email", type: "email" }, { name: "dateOfBirth", label: "Date of birth", type: "date" }, { name: "dependents", label: "Dependents", type: "number" }, { name: "nationality", label: "Nationality", options: ["Caymanian", "Jamaican", "British", "American", "Canadian", "Filipino", "Honduran", "Nicaraguan", "Dominican", "Indian", "Guyanese", "Trinidadian", "Other"] }, { name: "householdStatus", label: "Household/Marital status" }, { name: "citizenshipStatus", label: "Citizenship status", options: ["Caymanian", "Permanent Resident", "Work Permit Holder", "Spouse of Caymanian", "Naturalised Citizen", "Student Visa", "Visitor", "Other"] }, { name: "workPermitRequired", label: "Do you require a work permit?", type: "yesno" }, { name: "workPermitExpiryDate", label: "Work permit expiry date", type: "date", showWhen: { field: "workPermitRequired", equals: true } }, { name: "creditScoreKnown", label: "Do you know your credit score or profile?", type: "yesno" }, { name: "creditScoreOrProfile", label: "Credit score/profile", placeholder: "e.g. 720, Good, Fair", showWhen: { field: "creditScoreKnown", equals: true } }, { name: "bankruptcyHistory", label: "Have you ever filed for bankruptcy?", type: "yesno" }, { name: "missedPaymentsHistory", label: "Have you had missed or late payments?", type: "yesno" }] },
  { key: "contact", title: "Contact Information", description: "How to reach you", fields: [{ name: "phone", label: "Phone" }, { name: "alternatePhone", label: "Alternate phone" }, { name: "physicalAddress", label: "Physical address" }, { name: "mailingAddress", label: "Mailing address" }, { name: "countryOrMarket", label: "Country/Market", options: ["Cayman Islands", "Jamaica", "United States", "Canada", "United Kingdom", "Dominican Republic", "Trinidad and Tobago", "Barbados", "Bahamas", "Guyana", "Honduras", "Nicaragua", "Philippines", "India", "Other"] }, { name: "preferredCurrency", label: "Preferred currency", options: [{ value: "KYD", label: "KYD - Cayman Islands Dollar" }, { value: "USD", label: "USD - United States Dollar" }, { value: "JMD", label: "JMD - Jamaican Dollar" }, { value: "CAD", label: "CAD - Canadian Dollar" }, { value: "GBP", label: "GBP - British Pound" }, { value: "EUR", label: "EUR - Euro" }, { value: "DOP", label: "DOP - Dominican Peso" }, { value: "TTD", label: "TTD - Trinidad and Tobago Dollar" }, { value: "BBD", label: "BBD - Barbados Dollar" }, { value: "BSD", label: "BSD - Bahamian Dollar" }, { value: "GYD", label: "GYD - Guyanese Dollar" }, { value: "HNL", label: "HNL - Honduran Lempira" }, { value: "NIO", label: "NIO - Nicaraguan Cordoba" }, { value: "PHP", label: "PHP - Philippine Peso" }, { value: "INR", label: "INR - Indian Rupee" }, { value: "Other", label: "Other" }] }] },
  { key: "income", title: "Employment & Income", description: "Capture up to three monthly income sources. Reports use the total monthly income.", fields: [{ name: "employmentType", label: "Employment type" }, { name: "employer", label: "Employer" }, { name: "jobTitle", label: "Job title" }, { name: "employerAddress", label: "Employer address" }, { name: "employmentLength", label: "Employment length" }] },
  { key: "expenses", title: "Expenses", description: "Monthly spending", fields: [{ name: "expenseHousing", label: "Housing", type: "number" }, { name: "expenseUtilities", label: "Utilities", type: "number" }, { name: "expenseWater", label: "Water", type: "number" }, { name: "expenseTransport", label: "Transport", type: "number" }, { name: "expenseGroceries", label: "Groceries", type: "number" }, { name: "expenseInsurance", label: "Insurance", type: "number" }, { name: "expenseChildcare", label: "Childcare", type: "number" }, { name: "expenseEntertainment", label: "Entertainment", type: "number" }, { name: "expenseTravel", label: "Travel", type: "number" }, { name: "expenseDiscretionary", label: "Discretionary", type: "number" }, { name: "expenseOther", label: "Other non-debt living expenses", type: "number" }] },
  { key: "housing", title: "Housing & Property", description: "Housing profile", fields: [{ name: "housingStatus", label: "Housing status" }, { name: "rentAmount", label: "Rent amount", type: "number" }, { name: "mortgageBalance", label: "Mortgage balance", type: "number" }, { name: "propertyType", label: "Property type" }, { name: "propertyLocation", label: "Property location" }, { name: "mortgagePayment", label: "Mortgage payment", type: "number" }, { name: "mortgageRate", label: "Mortgage rate", type: "number" }, { name: "estimatedHomeValue", label: "Estimated home value", type: "number" }, { name: "propertyIdentified", label: "Property identified", type: "checkbox" }, { name: "purchaseAgreementAvailable", label: "Purchase agreement available", type: "checkbox" }, { name: "estimatedRoomRentalIncome", label: "Estimated room rental income", type: "number" }, { name: "spareRoomAvailable", label: "Spare room available", type: "checkbox" }] },
  { key: "debt", title: "Debts & Liabilities", description: "Debt snapshot", fields: [{ name: "debtName", label: "Debt name" }, { name: "debtType", label: "Debt type" }, { name: "debtBalance", label: "Debt balance", type: "number" }, { name: "debtMonthlyPayment", label: "Debt monthly payment", type: "number" }, { name: "debtInterestRate", label: "Debt interest rate", type: "number" }] },
  { key: "savings", title: "Savings & Assets", description: "Savings profile", fields: [{ name: "cashSavings", label: "Cash savings", type: "number" }, { name: "emergencyFund", label: "Emergency fund", type: "number" }, { name: "investments", label: "Investments", type: "number" }, { name: "retirementSavings", label: "Retirement savings", type: "number" }, { name: "downPaymentSavings", label: "Down payment savings", type: "number" }, { name: "otherAssets", label: "Other assets", type: "number" }, { name: "hasDownPaymentProof", label: "Has down payment proof", type: "checkbox" }, { name: "sourceOfDownPayment", label: "Source of down payment" }] },
  { key: "goals", title: "Goals & Loan Details", description: "Targets, loan details, and document checklist", fields: [{ name: "targetGoal", label: "Target goal" }, { name: "loanPurpose", label: "Loan purpose" }, { name: "requestedLoanAmount", label: "Requested loan amount", type: "number" }, { name: "desiredLoanTermYears", label: "Desired loan term years", type: "number" }, { name: "targetHomePrice", label: "Target home price", type: "number" }, { name: "purchasePrice", label: "Purchase price", type: "number" }, { name: "borrowerContribution", label: "Borrower contribution", type: "number" }, { name: "securityOffered", label: "Security offered" }, { name: "securityValue", label: "Security value", type: "number" }, { name: "goalTimeframe", label: "Goal timeframe" }, { name: "targetSavingsGoal", label: "Target savings goal", type: "number" }, { name: "targetDebtReduction", label: "Target debt reduction", type: "number" }, { name: "targetMonthlyCashFlow", label: "Target monthly cash flow", type: "number" }, { name: "hasID", label: "Has ID", type: "checkbox" }, { name: "hasProofOfAddress", label: "Proof of address available", type: "yesno", group: "documents" }, { name: "hasPayslips", label: "Payslips available", type: "yesno", group: "documents" }, { name: "hasEmploymentLetter", label: "Employment letter available", type: "yesno", group: "documents" }, { name: "hasBankStatements", label: "Bank statements available (3–6 months)", type: "yesno", group: "documents" }, { name: "hasDebtStatements", label: "Debt statements available", type: "yesno", group: "documents" }, { name: "hasCreditReport", label: "Credit report available", type: "yesno", group: "documents" }, { name: "hasPurchaseAgreement", label: "Purchase agreement available", type: "yesno", group: "documents" }, { name: "hasValuation", label: "Property valuation available", type: "yesno", group: "documents" }, { name: "hasBusinessFinancials", label: "Business financials available (if self-employed)", type: "yesno", group: "documents" }, { name: "hasTaxReturns", label: "Tax returns available", type: "yesno", group: "documents" }] }
];

const cards: Record<string, React.ComponentType<any>> = { personal: PersonalCard, contact: ContactCard, income: IncomeCard, expenses: ExpensesCard, housing: HousingCard, debt: DebtCard, savings: SavingsCard, goals: GoalsCard };
const stringValue = (value: unknown) => String(value ?? "");
const boolValue = (value: unknown) => Boolean(value);
const dateInputValue = (value: unknown) => {
  const text = stringValue(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
};

function incomeSourceFields(incomeSources: Array<Record<string, unknown>> = []) {
  const rows = Array.isArray(incomeSources) ? incomeSources.slice(0, 3) : [];
  const fields: FormState = {};
  [0, 1, 2].forEach((index) => {
    const source = rows[index] ?? {};
    const slot = index + 1;
    fields[`incomeSource${slot}Type`] = stringValue(source.type);
    fields[`incomeSource${slot}Label`] = stringValue(source.label);
    fields[`incomeSource${slot}MonthlyAmount`] = stringValue(source.monthly_amount);
    fields[`incomeSource${slot}Frequency`] = stringValue(source.frequency || "monthly");
    fields[`incomeSource${slot}Stability`] = stringValue(source.stability || "stable");
  });
  return fields;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("personal");
  const [formData, setFormData] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const user = await getUser();
      if (!user) return;
      const token = await getIdentityToken(user);
      if (!token) return;
      const response = await fetch("/.netlify/functions/profile-get", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok || cancelled) return;
      const data = await response.json();
      const profile = data.profile ?? {};
      const incomeSources = Array.isArray(data.incomeSources) ? data.incomeSources : [];
      const firstIncome = incomeSources[0] ?? {};
      setFormData({ customerName: stringValue(profile.customer_name), email: stringValue(profile.email || user.email), dateOfBirth: dateInputValue(profile.date_of_birth), dependents: stringValue(profile.dependents), nationality: stringValue(profile.nationality), householdStatus: stringValue(profile.household_status), citizenshipStatus: stringValue(profile.citizenship_status), workPermitRequired: boolValue(profile.work_permit_required), workPermitExpiryDate: dateInputValue(profile.work_permit_expiry_date), creditScoreKnown: boolValue(profile.credit_score_known), creditScoreOrProfile: stringValue(profile.credit_score_or_profile), bankruptcyHistory: boolValue(profile.bankruptcy_history), missedPaymentsHistory: boolValue(profile.missed_payments_history), phone: stringValue(profile.phone), alternatePhone: stringValue(profile.alternate_phone), physicalAddress: stringValue(profile.physical_address), mailingAddress: stringValue(profile.mailing_address), countryOrMarket: stringValue(profile.country_or_market), preferredCurrency: stringValue(profile.preferred_currency), employmentType: stringValue(profile.employment_type), employer: stringValue(profile.employer), jobTitle: stringValue(profile.job_title), employerAddress: stringValue(profile.employer_address), employmentLength: stringValue(profile.employment_length), monthlyGrossIncome: stringValue(profile.monthly_gross_income), monthlyNetIncome: stringValue(profile.monthly_net_income), incomeType: stringValue(firstIncome.type), incomeLabel: stringValue(firstIncome.label), incomeMonthlyAmount: stringValue(firstIncome.monthly_amount), incomeFrequency: stringValue(firstIncome.frequency), incomeStability: stringValue(firstIncome.stability), otherIncomeAmount: stringValue(profile.other_income_amount), otherIncomeDescription: stringValue(profile.other_income_description), ...incomeSourceFields(incomeSources), expenseHousing: stringValue(data.expenseProfile?.housing), expenseUtilities: stringValue(data.expenseProfile?.utilities), expenseWater: stringValue(data.expenseProfile?.water), expenseTransport: stringValue(data.expenseProfile?.transport), expenseGroceries: stringValue(data.expenseProfile?.groceries), expenseInsurance: stringValue(data.expenseProfile?.insurance), expenseChildcare: stringValue(data.expenseProfile?.childcare), expenseEntertainment: stringValue(data.expenseProfile?.entertainment), expenseTravel: stringValue(data.expenseProfile?.travel), expenseDiscretionary: stringValue(data.expenseProfile?.discretionary), expenseOther: stringValue(data.expenseProfile?.other), housingStatus: stringValue(data.housingProfile?.housing_status), rentAmount: stringValue(data.housingProfile?.rent_amount), mortgageBalance: stringValue(data.housingProfile?.mortgage_balance), mortgagePayment: stringValue(data.housingProfile?.mortgage_payment), mortgageRate: stringValue(data.housingProfile?.mortgage_rate), estimatedHomeValue: stringValue(data.housingProfile?.estimated_home_value), estimatedRoomRentalIncome: stringValue(data.housingProfile?.estimated_room_rental_income), spareRoomAvailable: boolValue(data.housingProfile?.spare_room_available), propertyType: stringValue(profile.property_type), propertyLocation: stringValue(profile.property_location), propertyIdentified: boolValue(profile.property_identified), purchaseAgreementAvailable: boolValue(profile.purchase_agreement_available), debtName: stringValue(data.debts?.[0]?.name), debtType: stringValue(data.debts?.[0]?.type), debtBalance: stringValue(data.debts?.[0]?.balance), debtMonthlyPayment: stringValue(data.debts?.[0]?.monthly_payment), debtInterestRate: stringValue(data.debts?.[0]?.interest_rate), cashSavings: stringValue(data.savingsProfile?.cash_savings), emergencyFund: stringValue(data.savingsProfile?.emergency_fund), investments: stringValue(data.savingsProfile?.investments), retirementSavings: stringValue(data.savingsProfile?.retirement_savings), downPaymentSavings: stringValue(data.savingsProfile?.down_payment_savings), otherAssets: stringValue(profile.other_assets), hasDownPaymentProof: boolValue(profile.has_down_payment_proof), sourceOfDownPayment: stringValue(profile.source_of_down_payment), targetGoal: stringValue(data.goals?.target_goal), loanPurpose: stringValue(profile.loan_purpose), requestedLoanAmount: stringValue(profile.requested_loan_amount), desiredLoanTermYears: stringValue(profile.desired_loan_term_years), targetHomePrice: stringValue(data.goals?.target_home_price), purchasePrice: stringValue(profile.purchase_price), borrowerContribution: stringValue(profile.borrower_contribution), securityOffered: stringValue(profile.security_offered), securityValue: stringValue(profile.security_value), goalTimeframe: stringValue(data.goals?.goal_timeframe), targetSavingsGoal: stringValue(data.goals?.target_savings_goal), targetDebtReduction: stringValue(data.goals?.target_debt_reduction), targetMonthlyCashFlow: stringValue(data.goals?.target_monthly_cash_flow), hasID: boolValue(profile.has_id), hasProofOfAddress: boolValue(profile.has_proof_of_address), hasPayslips: boolValue(profile.has_payslips), hasEmploymentLetter: boolValue(profile.has_employment_letter), hasBankStatements: boolValue(profile.has_bank_statements), hasDebtStatements: boolValue(profile.has_debt_statements), hasCreditReport: boolValue(profile.has_credit_report), hasPurchaseAgreement: boolValue(profile.has_purchase_agreement), hasValuation: boolValue(profile.has_valuation), hasBusinessFinancials: boolValue(profile.has_business_financials), hasTaxReturns: boolValue(profile.has_tax_returns) });
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  const activeIndex = sections.findIndex((section) => section.key === activeSection);
  const activeSectionData = sections[activeIndex];
  const completion = useMemo(() => { const provided = (field: OnboardingField) => { if (!isFieldVisible(field, formData)) return true; const value = formData[field.name]; return typeof value === "boolean" ? true : String(value ?? "").trim() !== ""; }; const completed = sections.filter((section) => section.fields.every((field) => provided(field))).length; return { completed, pct: Math.round((completed / sections.length) * 100) }; }, [formData]);
  const status = (section: OnboardingSection) => { const visible = section.fields.filter((field) => isFieldVisible(field, formData)); const filled = visible.filter((field) => typeof formData[field.name] === "boolean" || String(formData[field.name] ?? "").trim() !== "").length; if (filled === 0) return "Not started"; if (filled === visible.length) return "Complete"; return "In progress"; };
  const validateSection = (key: string) => { if (key === "income") { const hasIncome = [1, 2, 3].some((slot) => Number(formData[`incomeSource${slot}MonthlyAmount`] ?? 0) > 0); setSectionErrors((previous) => ({ ...previous, income: hasIncome ? "" : "Please enter at least one monthly income source." })); return hasIncome; } const section = sections.find((item) => item.key === key)!; const required = section.fields.slice(0, 2).filter((field) => field.name !== "email"); const missing = required.filter((field) => String(formData[field.name] ?? "").trim() === ""); setSectionErrors((previous) => ({ ...previous, [key]: missing.length ? `Please complete: ${missing.map((item) => item.label).join(", ")}` : "" })); return missing.length === 0; };

  const save = async (onlyCurrent = true) => {
    setSaving(true); setError(""); setMessage("");
    if (onlyCurrent && !validateSection(activeSection)) { setSaving(false); return; }
    try {
      const user = await getUser();
      if (!user) { router.replace("/login?callbackUrl=%2Fapp%2Fonboarding" as Route); return; }
      const token = await getIdentityToken(user);
      if (!token) { setError("Session verification failed."); return; }
      const response = await fetch("/.netlify/functions/profile-save", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...formData }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error || "Save failed"); return; }
      setMessage("Saved successfully.");
    } catch (err) { setError(describeAuthError(err)); } finally { setSaving(false); }
  };

  const ActiveCard = cards[activeSection];
  return <div className="space-y-4"><div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-sm font-medium">Profile Completion: {completion.pct}%</p><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-blue-600" style={{ width: `${completion.pct}%` }} /></div><div className="mt-3"><button className="rounded bg-[#0A2540] px-3 py-2 text-white" onClick={() => save(false)} disabled={saving}>{saving ? "Saving..." : "Save All"}</button></div></div><div className="grid gap-4 md:grid-cols-[280px,1fr]"><aside className="rounded-xl border bg-white p-3 shadow-sm"><h2 className="mb-2 font-semibold">Build Your Profile</h2><div className="flex gap-2 overflow-x-auto md:block md:space-y-2">{sections.map((section) => <button key={section.key} onClick={() => setActiveSection(section.key)} className={`w-full rounded border px-3 py-2 text-left text-sm ${activeSection === section.key ? "bg-blue-50 border-blue-300" : "bg-white"}`}><div className="font-medium">{section.title}</div><div className="text-xs text-slate-500">{status(section)}</div></button>)}</div></aside><section><ActiveCard title={activeSectionData.title} description={activeSectionData.description} fields={activeSectionData.fields} formData={formData} setFormData={setFormData} error={sectionErrors[activeSection]} /><div className="mt-3 flex flex-wrap gap-2"><button className="rounded border px-3 py-2" disabled={activeIndex === 0} onClick={() => setActiveSection(sections[Math.max(0, activeIndex - 1)].key)}>Previous Section</button><button className="rounded border px-3 py-2" disabled={activeIndex === sections.length - 1} onClick={() => setActiveSection(sections[Math.min(sections.length - 1, activeIndex + 1)].key)}>Next Section</button><button className="rounded bg-[#0A2540] px-3 py-2 text-white" onClick={() => save(true)} disabled={saving}>{saving ? "Saving..." : "Save Section"}</button></div></section></div>{message ? <p className="text-green-700 text-sm">{message}</p> : null}{error ? <p className="text-red-700 text-sm">{error}</p> : null}</div>;
}
