"use client";

import { useEffect, useMemo, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import { CNBApplication, mapProfileToCNBApplication } from "@/lib/finance/cnb-mapper";

type SavedOnboardingData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const statusFor = (value: string | number) => (String(value ?? "").trim() === "" || Number(value) === 0 ? "Missing" : "Ready");

function MappedField({ label, value, source, onChange, type = "text" }: { label: string; value: string | number; source: string; onChange: (v: string) => void; type?: "text" | "number" }) {
  const status = statusFor(value);
  const tone = status === "Ready" ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200";
  return (
    <label className="text-sm text-slate-700">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>{status}</span>
      </div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <p className="mt-1 text-xs text-slate-500">Source: {source}</p>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#0A2540]">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function LoanApplicationPage() {
  const [appData, setAppData] = useState<CNBApplication | null>(null);
  const [manualOnly, setManualOnly] = useState({
    idNumber: "",
    idIssueDate: "",
    idExpiryDate: "",
    nationalityManual: "",
    workPermitExpiryDate: "",
    mailingAddress: "",
    homePhone: "",
    workPhone: "",
    bankAccountNumbers: "",
    personalReferences: "",
    purposeLoanDetails: "",
    amountAppliedFor: "",
    securityOffered: "",
    backgroundQuestions: ""
  });

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user) return;
      const token = await getIdentityToken(user);
      if (!token) return;
      const response = await fetch("/.netlify/functions/profile-get", { method: "GET", credentials: "same-origin", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const payload = (await response.json()) as SavedOnboardingData;
      setAppData(mapProfileToCNBApplication(payload));
    };
    void load();
  }, []);

  const missingFields = useMemo(() => {
    if (!appData) return [] as string[];
    return [
      ["Customer Name", appData.customer.name],
      ["DOB", appData.customer.dob],
      ["Address", appData.customer.address],
      ["Phone", appData.customer.phone],
      ["Employer", appData.employment.employer],
      ["Job Title", appData.employment.jobTitle],
      ["Loan Purpose", appData.loan.purpose],
      ["Amount Requested", appData.loan.amountRequested]
    ]
      .filter((entry) => statusFor(entry[1]) === "Missing")
      .map((entry) => entry[0]);
  }, [appData]);

  if (!appData) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading application...</div>;

  const updateSection = <K extends keyof CNBApplication>(section: K, field: keyof CNBApplication[K], value: string) => {
    setAppData((prev) => (prev ? ({ ...prev, [section]: { ...prev[section], [field]: value } } as CNBApplication) : prev));
  };

  const documentChecklist = ["ID", "Address verification", "Payslips", "Bank statements", "Credit report", "Down payment proof"];

  const bankSummary = `Applicant has monthly income of ${formatCurrency(appData.income.totalIncome)}, expenses of ${formatCurrency(
    appData.expenses.totalExpenses
  )}, debt obligations of ${formatCurrency(appData.expenses.loanPayments + appData.expenses.creditCards)}, disposable income of ${formatCurrency(
    appData.summary.disposableIncome
  )}, net worth of ${formatCurrency(appData.summary.netWorth)}, and savings runway of ${appData.summary.runwayMonths.toFixed(1)} months.`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0A2540] bg-[#0A2540] p-6 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Personal Loan Application</p>
        <h1 className="mt-2 text-2xl font-semibold">Mapping Audit + Submit-ready preparation tool</h1>
      </div>

      <Section title="Mapping Audit (value + source + status)">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 md:col-span-2">
          Audit format: onboarding field → DB column → profile-get key → CNB field. Fields are marked Ready/Missing based on mapped value presence.
        </div>
      </Section>

      <Section title="A. CUSTOMER INFORMATION">
        <MappedField label="Customer Name" value={appData.customer.name} source="customerName → profiles.customer_name → profile.customer_name" onChange={(v) => updateSection("customer", "name", v)} />
        <MappedField label="Date of Birth" value={appData.customer.dob} source="dateOfBirth → profiles.date_of_birth → profile.date_of_birth" onChange={(v) => updateSection("customer", "dob", v)} />
        <MappedField label="Physical Address" value={appData.customer.address} source="physicalAddress → profiles.physical_address → profile.physical_address" onChange={(v) => updateSection("customer", "address", v)} />
        <MappedField label="Cell Phone" value={appData.customer.phone} source="phone → profiles.phone → profile.phone" onChange={(v) => updateSection("customer", "phone", v)} />
        <MappedField label="Country / Market" value={appData.customer.countryMarket} source="countryOrMarket → profiles.country_or_market → profile.country_or_market" onChange={(v) => updateSection("customer", "countryMarket", v)} />
        <MappedField label="Dependants" value={appData.customer.dependents} source="dependents → profiles.dependents → profile.dependents" onChange={(v) => updateSection("customer", "dependents", v)} type="number" />
      </Section>

      <Section title="B. EMPLOYMENT">
        <MappedField label="Employment Type" value={appData.employment.employmentType} source="employmentType → profiles.employment_type → profile.employment_type" onChange={(v) => updateSection("employment", "employmentType", v)} />
        <MappedField label="Employer / Business" value={appData.employment.employer} source="employer → profiles.employer → profile.employer" onChange={(v) => updateSection("employment", "employer", v)} />
        <MappedField label="Applicant Job Title" value={appData.employment.jobTitle} source="jobTitle → profiles.job_title → profile.job_title" onChange={(v) => updateSection("employment", "jobTitle", v)} />
        <MappedField label="Income Stability" value={appData.employment.incomeStability} source="incomeStability → income_sources.stability → incomeSources[0].stability" onChange={(v) => updateSection("employment", "incomeStability", v)} />
        <MappedField label="Frequency of Payments" value={appData.employment.incomeFrequency} source="incomeFrequency → income_sources.frequency → incomeSources[0].frequency" onChange={(v) => updateSection("employment", "incomeFrequency", v)} />
      </Section>

      <Section title="E. LOAN DETAILS">
        <MappedField label="Purpose of Loan" value={appData.loan.purpose} source="targetGoal → goals.target_goal → goals.target_goal" onChange={(v) => updateSection("loan", "purpose", v)} />
        <MappedField label="Purchase Price" value={appData.loan.purchasePrice} source="targetHomePrice → goals.target_home_price → goals.target_home_price" onChange={(v) => updateSection("loan", "purchasePrice", v)} type="number" />
        <MappedField label="Amount Applied For" value={appData.loan.amountRequested} source="targetHomePrice → goals.target_home_price → goals.target_home_price" onChange={(v) => updateSection("loan", "amountRequested", v)} type="number" />
        <MappedField label="Security Offered" value={appData.loan.securityValue} source="estimatedHomeValue → housing_profiles.estimated_home_value" onChange={(v) => updateSection("loan", "securityValue", v)} type="number" />
      </Section>

      <Section title="Manual-only CNB fields (editable)">
        {Object.entries(manualOnly).map(([key, value]) => (
          <MappedField key={key} label={key.replace(/([A-Z])/g, " $1")} value={value} source="Manual input only" onChange={(v) => setManualOnly((prev) => ({ ...prev, [key]: v }))} />
        ))}
      </Section>

      <Section title="G. STATEMENT OF AFFAIRS">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">Total Income: <span className="font-semibold">{formatCurrency(appData.income.totalIncome)}</span></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">Total Expenses: <span className="font-semibold">{formatCurrency(appData.expenses.totalExpenses)}</span></div>
        <div className={`rounded-lg border p-3 text-sm ${appData.summary.disposableIncome < 0 ? "border-red-300 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          Disposable Income: <span className="font-semibold">{formatCurrency(appData.summary.disposableIncome)}</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">Debt-to-Income: <span className="font-semibold">{formatPercent(appData.summary.debtToIncome)}</span></div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0A2540]">Warnings & Missing Data</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {missingFields.map((field) => (
              <li key={field} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">Missing: {field}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0A2540]">Export (Submit Ready)</h3>
          <div className="mt-3 flex flex-col gap-2">
            <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Print / Save as PDF</button>
            <button onClick={async () => navigator.clipboard.writeText(bankSummary)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Copy Bank Summary</button>
          </div>
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{bankSummary}</p>
          <ul className="mt-3 list-disc pl-5 text-xs text-slate-600">{documentChecklist.map((doc) => <li key={doc}>{doc}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
