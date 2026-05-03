"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import {
  housingEquity,
  housingPayment,
  monthlyDebtPayments,
  monthlySurplus,
  savingsRunwayMonths,
  toCurrency,
  toNumber,
  totalExpenses,
  totalIncome
} from "@/lib/finance/calculations";

type ProfileData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
};

type RentRoomScenario = {
  id: string;
  setup_json: Record<string, unknown>;
  income_json: Record<string, unknown>;
  costs_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  updated_at: string;
};

type ReportId = "snapshot" | "expense" | "loan" | "loan-docs" | "rent-room" | "savings" | "debt" | "housing";
type Status = "Strong" | "Needs attention" | "Incomplete" | "Review carefully" | "Missing data";

const reportOptions: Array<{ id: ReportId; label: string }> = [
  { id: "snapshot", label: "Financial Snapshot" },
  { id: "expense", label: "Expense Report" },
  { id: "loan", label: "Bank Loan Readiness Report" },
  { id: "loan-docs", label: "Loan Document Checklist" },
  { id: "rent-room", label: "Rent a Room Scenario Report" },
  { id: "savings", label: "Savings & Cash Flow Report" },
  { id: "debt", label: "Debt & Liability Report" },
  { id: "housing", label: "Housing & Equity Report" }
];

const bankChecklist = [
  "Government-issued ID",
  "Proof of address",
  "Employment letter",
  "Recent payslips",
  "3–6 months bank statements",
  "Existing loan/debt statements",
  "Credit report or credit profile",
  "Proof/source of down payment",
  "Purchase agreement or property details",
  "Property valuation/appraisal",
  "Insurance estimate",
  "Mortgage statement if refinancing",
  "Business registration and financials if self-employed",
  "Tax returns if required",
  "Rental income evidence if using rental income"
];

const badgeClass = (status: Status) => {
  if (status === "Strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Needs attention" || status === "Review carefully") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(status)}`}>{status}</span>
);

const toStatus = (value: boolean | null): Status => {
  if (value === null) return "Missing data";
  return value ? "Strong" : "Review carefully";
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ReportActions({ reportName, csvRows, summaryText, copied, onCopy }: { reportName: string; csvRows: string[][]; summaryText: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="print:hidden flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
        Print / Save as PDF
      </button>
      <button type="button" onClick={() => downloadCsv(`${reportName.toLowerCase().replace(/\s+/g, "-")}.csv`, csvRows)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
        Export CSV
      </button>
      <button type="button" onClick={async () => { await navigator.clipboard.writeText(summaryText); onCopy(); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
        Copy Summary
      </button>
      {copied ? <span className="self-center text-xs font-medium text-emerald-700">Copied.</span> : null}
    </div>
  );
}

function AmountCard({ title, value, status, note }: { title: string; value: string; status: Status; note?: string }) {
  return (
    <div className="card print:bg-white print:shadow-none">
      <h2 className="text-lg font-semibold text-[#0A2540]">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
      <div className="mt-2"><StatusBadge status={status} /></div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useWorkspaceUser();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportId>("snapshot");
  const [copiedReport, setCopiedReport] = useState<ReportId | null>(null);
  const [rentRoomScenario, setRentRoomScenario] = useState<RentRoomScenario | null>(null);
  const [rentRoomLoading, setRentRoomLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      const token = await getIdentityToken(user);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const response = await fetch("/.netlify/functions/profile-get", { headers: { Authorization: `Bearer ${token}` } });
      if (cancelled) return;
      if (!response.ok) {
        setLoadError("Unable to load profile data. Please update your profile.");
        setLoading(false);
        return;
      }
      setData((await response.json()) as ProfileData);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadRentRoomScenario() {
      if (activeReport !== "rent-room") return;
      setRentRoomLoading(true);
      const token = await getIdentityToken(user);
      if (!token) {
        if (!cancelled) { setRentRoomScenario(null); setRentRoomLoading(false); }
        return;
      }
      const response = await fetch("/.netlify/functions/rent-room-get", { headers: { Authorization: `Bearer ${token}` } });
      if (cancelled) return;
      if (!response.ok) {
        setRentRoomScenario(null);
        setRentRoomLoading(false);
        return;
      }
      const payload = (await response.json()) as { scenario: RentRoomScenario | null };
      setRentRoomScenario(payload.scenario ?? null);
      setRentRoomLoading(false);
    }
    void loadRentRoomScenario();
    return () => { cancelled = true; };
  }, [activeReport, user]);

  const metrics = useMemo(() => {
    const income = totalIncome(data?.incomeSources ?? [], data?.profile ?? null);
    const nonHousingExpenses = totalExpenses(data?.expenseProfile ?? null);
    const housing = housingPayment(data?.housingProfile ?? null);
    const totalExpenseWithHousing = nonHousingExpenses + housing;
    const debtPayments = monthlyDebtPayments(data?.debts ?? []);
    const totalMonthlyObligations = totalExpenseWithHousing + debtPayments;
    const surplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null, data?.housingProfile ?? null, data?.debts ?? [], data?.profile ?? null);
    const totalDebtAmount = (data?.debts ?? []).reduce((sum, debt) => sum + toNumber(debt.balance), 0);
    const dti = income > 0 ? debtPayments / income : null;
    const adjustedSurplus = income - totalExpenseWithHousing - debtPayments;
    const homeValue = toNumber(data?.housingProfile?.estimated_home_value);
    const mortgageBalance = toNumber(data?.housingProfile?.mortgage_balance);
    const mortgagePayment = toNumber(data?.housingProfile?.mortgage_payment);
    const housingRatio = income > 0 ? housing / income : null;
    const ltv = homeValue > 0 ? mortgageBalance / homeValue : null;
    const equity = housingEquity(data?.housingProfile ?? null);
    const cashSavings = toNumber(data?.savingsProfile?.cash_savings);
    const emergencyFund = toNumber(data?.savingsProfile?.emergency_fund);
    const downPaymentSavings = toNumber(data?.savingsProfile?.down_payment_savings);
    const savingsBalance = cashSavings + emergencyFund + downPaymentSavings + toNumber(data?.savingsProfile?.investments) + toNumber(data?.savingsProfile?.retirement_savings);
    const runwayMonths = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null, data?.housingProfile ?? null);
    const currency = String(data?.profile?.preferred_currency ?? "USD") || "USD";
    const expenseRows = [
      { label: "Housing", value: housing },
      { label: "Utilities", value: toNumber(data?.expenseProfile?.utilities) },
      { label: "Transport", value: toNumber(data?.expenseProfile?.transport) },
      { label: "Groceries", value: toNumber(data?.expenseProfile?.groceries) },
      { label: "Insurance", value: toNumber(data?.expenseProfile?.insurance) },
      { label: "Childcare", value: toNumber(data?.expenseProfile?.childcare) },
      { label: "Discretionary", value: toNumber(data?.expenseProfile?.discretionary) },
      { label: "Other", value: toNumber(data?.expenseProfile?.other) }
    ].map((row) => ({ ...row, pct: totalExpenseWithHousing > 0 ? (row.value / totalExpenseWithHousing) * 100 : 0 }));
    return {
      income, nonHousingExpenses, housing, totalExpenseWithHousing, debtPayments, totalMonthlyObligations,
      surplus, totalDebtAmount, dti, adjustedSurplus, homeValue, mortgageBalance, mortgagePayment,
      housingRatio, ltv, equity, cashSavings, emergencyFund, downPaymentSavings, savingsBalance,
      runwayMonths, currency, expenseRows, topExpenseRows: [...expenseRows].sort((a, b) => b.value - a.value).slice(0, 3)
    };
  }, [data]);

  const loanStatus = {
    dti: toStatus(metrics.dti === null ? null : metrics.dti <= 0.36),
    housing: toStatus(metrics.housingRatio === null ? null : metrics.housingRatio <= 0.3),
    surplus: toStatus(metrics.income <= 0 ? null : metrics.adjustedSurplus >= 0),
    runway: toStatus(metrics.runwayMonths === null ? null : metrics.runwayMonths >= 3),
    ltv: toStatus(metrics.ltv === null ? null : metrics.ltv <= 0.8)
  } as Record<string, Status>;

  const snapshotStatus: Record<"income" | "expenses" | "surplus" | "runway" | "debt" | "goals", Status> = {
    income: metrics.income > 0 ? "Strong" : "Incomplete",
    expenses: metrics.nonHousingExpenses > 0 ? "Strong" : "Incomplete",
    surplus: metrics.income <= 0 ? "Incomplete" : metrics.surplus >= 0 ? "Strong" : "Needs attention",
    runway: metrics.runwayMonths === null ? "Incomplete" : metrics.runwayMonths >= 3 ? "Strong" : "Needs attention",
    debt: metrics.totalDebtAmount <= 0 ? "Incomplete" : metrics.dti !== null && metrics.dti <= 0.36 ? "Strong" : "Needs attention",
    goals: data?.goals?.target_goal ? "Strong" : "Incomplete"
  };

  const borrowerSnapshot = [
    ["Country/market", String(data?.profile?.country ?? "Missing data")],
    ["Preferred currency", String(data?.profile?.preferred_currency ?? "Missing data")],
    ["Employment type", String(data?.profile?.employment_type ?? "Missing data")],
    ["Household status", String(data?.profile?.household_status ?? "Missing data")],
    ["Dependents", String(data?.profile?.dependents ?? "Missing data")],
    ["Credit profile status", String(data?.profile?.credit_profile_status ?? "Missing data")]
  ];

  const missingInfo = [
    metrics.income <= 0 ? "income" : null,
    data?.profile?.employment_type ? null : "employment type",
    metrics.nonHousingExpenses <= 0 ? "expenses" : null,
    metrics.debtPayments <= 0 ? "debt payment details" : null,
    data?.profile?.credit_profile_status ? null : "credit profile",
    metrics.downPaymentSavings > 0 ? null : "savings/down payment",
    metrics.homeValue > 0 ? null : "property value",
    metrics.mortgageBalance > 0 && metrics.mortgagePayment > 0 ? null : "mortgage balance/payment",
    "bank statements/documentation"
  ].filter(Boolean);

  const bankConversationSummary = `Based on the information provided, the applicant has monthly income of ${toCurrency(metrics.income, metrics.currency)}, monthly expenses of ${toCurrency(metrics.nonHousingExpenses, metrics.currency)}, monthly debt payments of ${toCurrency(metrics.debtPayments, metrics.currency)}, estimated surplus of ${toCurrency(metrics.adjustedSurplus, metrics.currency)}, savings runway of ${metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`}, and estimated property equity of ${metrics.homeValue > 0 ? toCurrency(metrics.equity, metrics.currency) : "Missing data"}. Items to confirm with the bank include: ${missingInfo.join(", ") || "none identified"}.`;

  if (loading) return <div className="card text-sm text-slate-600">Loading reports…</div>;
  if (loadError) {
    return (
      <div className="card">
        <p className="text-sm text-amber-700">{loadError}</p>
        <Link href="/app/onboarding" className="mt-3 inline-flex rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white">Complete your profile</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 print:bg-white">
      <section className="card space-y-4 print:bg-white print:shadow-none">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Reports</h1>
          <p className="mt-2 text-sm text-slate-600">Select a report type to review your financial position from different angles.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {reportOptions.map((option) => {
            const active = activeReport === option.id;
            return <button key={option.id} type="button" onClick={() => setActiveReport(option.id)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex-none ${active ? "bg-[#0A2540] text-white" : "border border-slate-300 text-slate-600 hover:border-slate-400"}`}>{option.label}</button>;
          })}
        </div>
        <div className="border-t border-slate-200 print:hidden" />
        <div className="print:hidden flex flex-wrap gap-2 text-sm">
          <Link href="/app/tools/rent-a-room" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:border-slate-400">Rent-a-Room Report →</Link>
          <Link href="/app/loan-readiness" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:border-slate-400">Loan readiness →</Link>
          <Link href="/app/prequalification/proven-bank" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:border-slate-400">Bank prequalification →</Link>
        </div>
      </section>

      {activeReport === "snapshot" ? (
        <section className="grid gap-3 md:grid-cols-2 print:bg-white">
          <div className="card md:col-span-2 print:bg-white print:shadow-none">
            <div className="flex items-baseline gap-2 mb-4"><span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(metrics.income, metrics.currency)}</span><span className="text-sm text-slate-500">monthly income</span></div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0A2540]">Financial Snapshot</h2>
              <ReportActions reportName="financial-snapshot" csvRows={[["Metric", "Value"], ["Monthly Income", toCurrency(metrics.income, metrics.currency)], ["Monthly Expenses", toCurrency(metrics.totalExpenseWithHousing, metrics.currency)], ["Monthly Surplus", toCurrency(metrics.surplus, metrics.currency)], ["Savings Runway", metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`]]} summaryText={`Financial Snapshot: income ${toCurrency(metrics.income, metrics.currency)}, expenses ${toCurrency(metrics.totalExpenseWithHousing, metrics.currency)}, surplus ${toCurrency(metrics.surplus, metrics.currency)}, savings runway ${metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`}, debt ${toCurrency(metrics.totalDebtAmount, metrics.currency)}.`} copied={copiedReport === "snapshot"} onCopy={() => { setCopiedReport("snapshot"); window.setTimeout(() => setCopiedReport(null), 1500); }} />
            </div>
          </div>
          <AmountCard title="Income summary" value={`Total monthly income: ${toCurrency(metrics.income, metrics.currency)}`} status={snapshotStatus.income} />
          <AmountCard title="Expense summary" value={`Total monthly expenses: ${toCurrency(metrics.totalExpenseWithHousing, metrics.currency)}`} note={`Housing included: ${toCurrency(metrics.housing, metrics.currency)}`} status={snapshotStatus.expenses} />
          <AmountCard title="Monthly surplus" value={toCurrency(metrics.surplus, metrics.currency)} status={snapshotStatus.surplus} />
          <AmountCard title="Savings runway" value={metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`} status={snapshotStatus.runway} />
          <AmountCard title="Debt total" value={toCurrency(metrics.totalDebtAmount, metrics.currency)} status={snapshotStatus.debt} />
          <AmountCard title="Goal summary" value={String(data?.goals?.target_goal ?? "Missing data")} status={snapshotStatus.goals} />
        </section>
      ) : null}

      {activeReport === "expense" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Expense Report</h2>
            <ReportActions reportName="expense-report" csvRows={[["Category", "Amount", "Percentage of Total Expenses"], ...metrics.expenseRows.map((row) => [row.label, toCurrency(row.value, metrics.currency), `${row.pct.toFixed(1)}%`])]} summaryText={`Expense Report: total monthly expenses ${toCurrency(metrics.totalExpenseWithHousing, metrics.currency)}. Top categories: ${metrics.topExpenseRows.map((row) => row.label).join(", ") || "Missing data"}.`} copied={copiedReport === "expense"} onCopy={() => { setCopiedReport("expense"); window.setTimeout(() => setCopiedReport(null), 1500); }} />
          </div>
          <div className="flex items-baseline gap-2 mb-4"><span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(metrics.totalExpenseWithHousing, metrics.currency)}</span><span className="text-sm text-slate-500">total monthly expenses</span></div>
          <p className="text-sm text-slate-600">Housing is included in total expenses and is sourced from mortgage or rent details.</p>
          <div className="grid gap-2 md:grid-cols-2">{metrics.expenseRows.map((row) => <div key={row.label} className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-medium text-[#0A2540]">{row.label === "Housing" ? "Housing (Mortgage / Rent)" : row.label}</p><p className="text-slate-600">{toCurrency(row.value, metrics.currency)}</p><p className="text-xs text-slate-500">{row.pct.toFixed(1)}% of total</p></div>)}</div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#0A2540]">Top 3 expense categories: {metrics.topExpenseRows.map((row) => row.label).join(", ") || "Missing data"}</div>
        </section>
      ) : null}

      {activeReport === "loan" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold text-[#0A2540]">Bank Loan Readiness Report</h2><ReportActions reportName="bank-loan-readiness" csvRows={[["Metric", "Value"], ...borrowerSnapshot, ["Monthly income", toCurrency(metrics.income, metrics.currency)], ["Non-housing living expenses", toCurrency(metrics.nonHousingExpenses, metrics.currency)], ["Housing payment", toCurrency(metrics.housing, metrics.currency)], ["Debt payments", toCurrency(metrics.debtPayments, metrics.currency)], ["Total monthly obligations", toCurrency(metrics.totalMonthlyObligations, metrics.currency)], ["Debt-to-income ratio", metrics.dti === null ? "Missing data" : `${(metrics.dti * 100).toFixed(1)}%`], ["Adjusted surplus", toCurrency(metrics.adjustedSurplus, metrics.currency)], ["Savings runway", metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`]]} summaryText={bankConversationSummary} copied={copiedReport === "loan"} onCopy={() => { setCopiedReport("loan"); window.setTimeout(() => setCopiedReport(null), 1500); }} /></div>
          <div className="flex items-baseline gap-2 mb-4"><span className="text-4xl font-semibold text-[#0A2540]">{metrics.dti === null ? "—" : `${Math.round((1 - Math.min(metrics.dti, 1)) * 100)}`}</span><span className="text-sm text-slate-500">/ 100 estimated readiness</span></div>
          <div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-slate-200 p-3 text-sm"><h3 className="font-semibold text-[#0A2540]">Debt-to-Income</h3><p className="mt-2 text-slate-600">{metrics.dti === null ? "Missing data" : `${(metrics.dti * 100).toFixed(1)}%`}</p><StatusBadge status={loanStatus.dti} /></div><div className="rounded-lg border border-slate-200 p-3 text-sm"><h3 className="font-semibold text-[#0A2540]">Housing Ratio</h3><p className="mt-2 text-slate-600">{metrics.housingRatio === null ? "Missing data" : `${(metrics.housingRatio * 100).toFixed(1)}%`}</p><StatusBadge status={loanStatus.housing} /></div><div className="rounded-lg border border-slate-200 p-3 text-sm"><h3 className="font-semibold text-[#0A2540]">Adjusted Surplus</h3><p className="mt-2 text-slate-600">{toCurrency(metrics.adjustedSurplus, metrics.currency)}</p><StatusBadge status={loanStatus.surplus} /></div><div className="rounded-lg border border-slate-200 p-3 text-sm"><h3 className="font-semibold text-[#0A2540]">Savings Runway</h3><p className="mt-2 text-slate-600">{metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`}</p><StatusBadge status={loanStatus.runway} /></div></div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#0A2540]">{bankConversationSummary}</div>
        </section>
      ) : null}

      {activeReport === "loan-docs" ? <section className="card space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold text-[#0A2540]">Loan Document Checklist</h2><ReportActions reportName="loan-document-checklist" csvRows={[["Document"], ...bankChecklist.map((item) => [item])]} summaryText={`Loan Document Checklist: prepare ${bankChecklist.length} core documents before lender submission.`} copied={copiedReport === "loan-docs"} onCopy={() => { setCopiedReport("loan-docs"); window.setTimeout(() => setCopiedReport(null), 1500); }} /></div><div className="grid gap-2 md:grid-cols-2">{bankChecklist.map((item) => <div key={item} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">□ {item}</div>)}</div></section> : null}

      {activeReport === "rent-room" ? <section className="card space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold text-[#0A2540]">Rent a Room Scenario Report</h2><Link href="/app/tools/rent-a-room" className="print:hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">Update Scenario</Link></div>{rentRoomLoading ? <p className="text-sm text-slate-600">Loading rent-a-room scenario…</p> : rentRoomScenario ? <div className="grid gap-3 md:grid-cols-3"><AmountCard title="Monthly rent income" value={toCurrency(toNumber(rentRoomScenario.income_json?.monthlyRent), metrics.currency)} status="Strong" /><AmountCard title="Monthly costs" value={toCurrency(Object.values(rentRoomScenario.costs_json ?? {}).reduce((sum, value) => sum + toNumber(value), 0), metrics.currency)} status="Review carefully" /><AmountCard title="Estimated result" value={toCurrency(toNumber(rentRoomScenario.result_json?.monthlyNetProfit ?? rentRoomScenario.result_json?.netMonthly), metrics.currency)} status="Strong" /></div> : <p className="text-sm text-slate-600">No rent-a-room scenario found. Use the Rent-a-Room tool to create one.</p>}</section> : null}

      {activeReport === "savings" ? <section className="grid gap-3 md:grid-cols-2"><AmountCard title="Savings & Cash Flow Report" value={`Total savings: ${toCurrency(metrics.savingsBalance, metrics.currency)}`} note={`Monthly surplus: ${toCurrency(metrics.surplus, metrics.currency)}`} status={snapshotStatus.runway} /><AmountCard title="Emergency runway" value={metrics.runwayMonths === null ? "Missing data" : `${metrics.runwayMonths.toFixed(1)} months`} status={snapshotStatus.runway} /><AmountCard title="Cash savings" value={toCurrency(metrics.cashSavings, metrics.currency)} status={metrics.cashSavings > 0 ? "Strong" : "Incomplete"} /><AmountCard title="Down payment savings" value={toCurrency(metrics.downPaymentSavings, metrics.currency)} status={metrics.downPaymentSavings > 0 ? "Strong" : "Incomplete"} /></section> : null}

      {activeReport === "debt" ? <section className="card space-y-3"><h2 className="text-lg font-semibold text-[#0A2540]">Debt & Liability Report</h2><div className="flex items-baseline gap-2 mb-4"><span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(metrics.totalDebtAmount, metrics.currency)}</span><span className="text-sm text-slate-500">total debt</span></div><div className="grid gap-2 md:grid-cols-2">{(data?.debts ?? []).length === 0 ? <p className="text-sm text-slate-600">No debt records saved.</p> : (data?.debts ?? []).map((debt, index) => <div key={index} className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-medium text-[#0A2540]">{String(debt.name ?? debt.type ?? `Debt ${index + 1}`)}</p><p className="text-slate-600">Balance: {toCurrency(toNumber(debt.balance), metrics.currency)}</p><p className="text-slate-600">Monthly payment: {toCurrency(toNumber(debt.monthly_payment ?? debt.monthlyPayment), metrics.currency)}</p></div>)}</div></section> : null}

      {activeReport === "housing" ? <section className="grid gap-3 md:grid-cols-2"><AmountCard title="Housing & Equity Report" value={`Estimated home value: ${toCurrency(metrics.homeValue, metrics.currency)}`} status={metrics.homeValue > 0 ? "Strong" : "Incomplete"} /><AmountCard title="Mortgage balance" value={toCurrency(metrics.mortgageBalance, metrics.currency)} status={metrics.mortgageBalance > 0 ? "Strong" : "Incomplete"} /><AmountCard title="Estimated equity" value={toCurrency(metrics.equity, metrics.currency)} status={metrics.equity > 0 ? "Strong" : "Needs attention"} /><AmountCard title="Housing payment" value={toCurrency(metrics.housing, metrics.currency)} status={metrics.housing > 0 ? "Strong" : "Incomplete"} /></section> : null}
    </div>
  );
}
