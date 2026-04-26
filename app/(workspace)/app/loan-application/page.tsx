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

const getStatus = (app: CNBApplication, hasMissingData: boolean) => {
  const surplusOk = app.summary.disposableIncome > 0;
  const dtiOk = app.summary.debtToIncome < 40;
  const runwayOk = app.summary.runwayMonths > 3;

  const checks = [surplusOk, dtiOk, runwayOk, !hasMissingData].filter(Boolean).length;
  if (checks >= 4) return { label: "Strong", tone: "text-green-700 bg-green-50 border-green-200" };
  if (checks >= 2) return { label: "Needs Attention", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "High Risk", tone: "text-red-700 bg-red-50 border-red-200" };
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#0A2540]">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  missing = false
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  missing?: boolean;
}) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
          missing ? "border-red-300 bg-red-50" : "border-slate-300 bg-white focus:border-blue-500"
        }`}
      />
      {missing ? <span className="mt-1 block text-xs text-red-600">Missing data</span> : null}
    </label>
  );
}

export default function LoanApplicationPage() {
  const [appData, setAppData] = useState<CNBApplication | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user) return;
      const token = await getIdentityToken(user);
      if (!token) return;

      const response = await fetch("/.netlify/functions/profile-get", {
        method: "GET",
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });
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
      ["Employer", appData.employment.employer],
      ["Job Title", appData.employment.jobTitle],
      ["Loan Purpose", appData.loan.purpose],
      ["Amount Requested", appData.loan.amountRequested]
    ]
      .filter((entry) => !entry[1])
      .map((entry) => entry[0]);
  }, [appData]);

  const readiness = useMemo(() => {
    if (!appData) return null;
    return getStatus(appData, missingFields.length > 0);
  }, [appData, missingFields.length]);

  if (!appData) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading application...</div>;
  }

  const updateSection = <K extends keyof CNBApplication>(section: K, field: keyof CNBApplication[K], value: string) => {
    setAppData((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        [section]: { ...prev[section], [field]: value }
      } as CNBApplication;

      const totalIncome =
        Number(next.income.applicantIncome || 0) +
        Number(next.income.rentalIncome || 0) +
        Number(next.income.investmentIncome || 0) +
        Number(next.income.otherIncome || 0);
      const totalExpenses =
        Number(next.expenses.housing || 0) +
        Number(next.expenses.loanPayments || 0) +
        Number(next.expenses.creditCards || 0) +
        Number(next.expenses.insurance || 0) +
        Number(next.expenses.food || 0) +
        Number(next.expenses.utilities || 0) +
        Number(next.expenses.transport || 0) +
        Number(next.expenses.other || 0);
      const totalAssets =
        Number(next.assets.bankBalances || 0) + Number(next.assets.investments || 0) + Number(next.assets.realEstate || 0) + Number(next.assets.vehicles || 0);
      const totalLiabilities =
        Number(next.liabilities.loans || 0) + Number(next.liabilities.mortgages || 0) + Number(next.liabilities.creditCards || 0) + Number(next.liabilities.otherDebts || 0);
      const disposableIncome = totalIncome - totalExpenses;

      next.income.totalIncome = totalIncome;
      next.expenses.totalExpenses = totalExpenses;
      next.assets.totalAssets = totalAssets;
      next.liabilities.totalLiabilities = totalLiabilities;
      next.summary.disposableIncome = disposableIncome;
      next.summary.netWorth = totalAssets - totalLiabilities;
      next.summary.debtToIncome = totalIncome > 0 ? ((Number(next.expenses.loanPayments) + Number(next.expenses.creditCards)) / totalIncome) * 100 : 0;
      next.summary.housingRatio = totalIncome > 0 ? (Number(next.expenses.housing) / totalIncome) * 100 : 0;
      next.summary.runwayMonths = totalExpenses > 0 ? Number(next.assets.bankBalances) / totalExpenses : 0;

      return next;
    });
  };

  const documentChecklist = [
    "ID",
    "Address verification",
    "Payslips",
    "Bank statements",
    "Credit report",
    "Down payment proof",
    ...(String(appData.employment.employmentType).toLowerCase().includes("self") ? ["Business financials", "Tax returns"] : []),
    ...(String(appData.customer.nationality).toLowerCase() !== "cayman islands" ? ["Work permit"] : []),
    ...(appData.loan.purchasePrice > 0 ? ["Purchase agreement", "Valuation"] : [])
  ];

  const bankSummary = `Applicant has monthly income of ${formatCurrency(appData.income.totalIncome)}, expenses of ${formatCurrency(
    appData.expenses.totalExpenses
  )}, debt obligations of ${formatCurrency(
    appData.expenses.loanPayments + appData.expenses.creditCards
  )}, disposable income of ${formatCurrency(appData.summary.disposableIncome)}, net worth of ${formatCurrency(
    appData.summary.netWorth
  )}, and savings runway of ${appData.summary.runwayMonths.toFixed(1)} months. Loan request is ${formatCurrency(
    appData.loan.amountRequested
  )} for purpose ${appData.loan.purpose || "N/A"}. Supporting documentation required includes ${documentChecklist.join(", "
  )}.`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0A2540] bg-[#0A2540] p-6 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Cayman National • Personal Loan Application</p>
        <h1 className="mt-2 text-2xl font-semibold">Submit-ready preparation tool</h1>
        <div className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${readiness?.tone}`}>
          Loan Readiness Score: {readiness?.label}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <Section title="A. CUSTOMER INFORMATION">
            <Field label="Name" value={appData.customer.name} onChange={(v) => updateSection("customer", "name", v)} missing={!appData.customer.name} />
            <Field label="Date of birth" value={appData.customer.dob} onChange={(v) => updateSection("customer", "dob", v)} missing={!appData.customer.dob} />
            <Field label="Marital status" value={appData.customer.maritalStatus} onChange={(v) => updateSection("customer", "maritalStatus", v)} />
            <Field label="Dependents" type="number" value={appData.customer.dependents} onChange={(v) => updateSection("customer", "dependents", v)} />
            <Field label="Nationality" value={appData.customer.nationality} onChange={(v) => updateSection("customer", "nationality", v)} />
            <Field label="Address" value={appData.customer.address} onChange={(v) => updateSection("customer", "address", v)} missing={!appData.customer.address} />
          </Section>

          <Section title="B. EMPLOYMENT">
            <Field label="Employer" value={appData.employment.employer} onChange={(v) => updateSection("employment", "employer", v)} missing={!appData.employment.employer} />
            <Field label="Job title" value={appData.employment.jobTitle} onChange={(v) => updateSection("employment", "jobTitle", v)} missing={!appData.employment.jobTitle} />
            <Field label="Length of service" value={appData.employment.lengthOfService} onChange={(v) => updateSection("employment", "lengthOfService", v)} />
            <Field label="Employment type" value={appData.employment.employmentType} onChange={(v) => updateSection("employment", "employmentType", v)} />
          </Section>

          <Section title="C. CO-APPLICANT (OPTIONAL)">
            <Field label="Co-applicant name" value={""} onChange={() => undefined} />
            <Field label="Relationship" value={""} onChange={() => undefined} />
          </Section>

          <Section title="D. BANKING">
            <Field label="Primary banker" value={appData.banking.primaryBanker} onChange={(v) => updateSection("banking", "primaryBanker", v)} />
            <Field label="Accounts" value={appData.banking.accounts} onChange={(v) => updateSection("banking", "accounts", v)} />
            <Field label="Credit cards" type="number" value={appData.banking.creditCards} onChange={(v) => updateSection("banking", "creditCards", v)} />
          </Section>

          <Section title="E. LOAN DETAILS">
            <Field label="Purpose" value={appData.loan.purpose} onChange={(v) => updateSection("loan", "purpose", v)} missing={!appData.loan.purpose} />
            <Field label="Amount requested" type="number" value={appData.loan.amountRequested} onChange={(v) => updateSection("loan", "amountRequested", v)} missing={!appData.loan.amountRequested} />
            <Field label="Purchase price" type="number" value={appData.loan.purchasePrice} onChange={(v) => updateSection("loan", "purchasePrice", v)} />
            <Field label="Contribution" type="number" value={appData.loan.contribution} onChange={(v) => updateSection("loan", "contribution", v)} />
            <Field label="Security value" type="number" value={appData.loan.securityValue} onChange={(v) => updateSection("loan", "securityValue", v)} />
          </Section>

          <Section title="F. PERSONAL REFERENCES">
            <Field label="Reference 1" value={""} onChange={() => undefined} />
            <Field label="Reference 2" value={""} onChange={() => undefined} />
          </Section>

          <Section title="G. STATEMENT OF AFFAIRS">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              Total Income: <span className="font-semibold">{formatCurrency(appData.income.totalIncome)}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              Total Expenses: <span className="font-semibold">{formatCurrency(appData.expenses.totalExpenses)}</span>
            </div>
            <div className={`rounded-lg border p-3 text-sm ${appData.summary.disposableIncome < 0 ? "border-red-300 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
              Disposable Income: <span className="font-semibold">{formatCurrency(appData.summary.disposableIncome)}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              Debt-to-Income: <span className="font-semibold">{formatPercent(appData.summary.debtToIncome)}</span>
              {appData.summary.debtToIncome >= 40 ? <p className="mt-1 text-amber-700">Warning: high debt-to-income ratio.</p> : null}
            </div>
          </Section>

          <Section title="H. ASSETS">
            <Field label="Bank balances" type="number" value={appData.assets.bankBalances} onChange={(v) => updateSection("assets", "bankBalances", v)} />
            <Field label="Investments" type="number" value={appData.assets.investments} onChange={(v) => updateSection("assets", "investments", v)} />
            <Field label="Real estate" type="number" value={appData.assets.realEstate} onChange={(v) => updateSection("assets", "realEstate", v)} />
            <Field label="Vehicles" type="number" value={appData.assets.vehicles} onChange={(v) => updateSection("assets", "vehicles", v)} />
          </Section>

          <Section title="I. LIABILITIES">
            <Field label="Loans" type="number" value={appData.liabilities.loans} onChange={(v) => updateSection("liabilities", "loans", v)} />
            <Field label="Mortgages" type="number" value={appData.liabilities.mortgages} onChange={(v) => updateSection("liabilities", "mortgages", v)} />
            <Field label="Credit cards" type="number" value={appData.liabilities.creditCards} onChange={(v) => updateSection("liabilities", "creditCards", v)} />
            <Field label="Other debts" type="number" value={appData.liabilities.otherDebts} onChange={(v) => updateSection("liabilities", "otherDebts", v)} />
          </Section>

          <Section title="J. BACKGROUND">
            <Field label="Any prior defaults?" value={"No"} onChange={() => undefined} />
            <Field label="Any pending legal claims?" value={"No"} onChange={() => undefined} />
          </Section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0A2540]">Warnings & Missing Data</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {missingFields.map((field) => (
                <li key={field} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">
                  Missing: {field}
                </li>
              ))}
              {appData.summary.runwayMonths <= 3 ? <li className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">Low savings runway (&lt;=3 months).</li> : null}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0A2540]">Document Checklist</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {documentChecklist.map((doc) => (
                <li key={doc} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                  {doc}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0A2540]">Export (Submit Ready)</h3>
            <div className="mt-3 flex flex-col gap-2">
              <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
                Print / Save as PDF
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "cnb-loan-application.json";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Download JSON
              </button>
              <button
                onClick={async () => navigator.clipboard.writeText(bankSummary)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Copy Bank Summary
              </button>
            </div>
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{bankSummary}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
