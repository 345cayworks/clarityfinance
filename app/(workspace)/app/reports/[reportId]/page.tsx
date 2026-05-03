"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import {
  debtToIncomeRatio,
  housingEquity,
  housingPayment,
  monthlyDebtPayments,
  monthlySurplus,
  savingsRunwayMonths,
  toCurrency,
  totalExpenses,
  totalIncome
} from "@/lib/finance/calculations";

type Status = "Strong" | "Needs attention" | "Incomplete" | "Review carefully" | "Missing data";

type ReportResponse = {
  report: {
    id: string;
    title: string;
    reportType: string;
    generatedAt: string | null;
    reportJson: Record<string, unknown>;
  };
};

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function badgeClass(status: Status) {
  if (status === "Strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Needs attention" || status === "Review carefully") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(status)}`}>{status}</span>;
}

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
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(summaryText);
          onCopy();
        }}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
      >
        Copy Summary
      </button>
      {copied ? <span className="self-center text-xs font-medium text-emerald-700">Copied.</span> : null}
    </div>
  );
}

function SummaryCard({ title, value, status, helper }: { title: string; value: string; status: Status; helper?: string }) {
  return (
    <div className="card print:bg-white print:shadow-none">
      <h2 className="text-lg font-semibold text-[#0A2540]">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
      <div className="mt-2"><StatusBadge status={status} /></div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 print:bg-white print:shadow-none">
      <h2 className="text-lg font-semibold text-[#0A2540]">{title}</h2>
      {children}
    </section>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const { user } = useWorkspaceUser();
  const [report, setReport] = useState<ReportResponse["report"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      const token = await getIdentityToken(user);
      if (!token) {
        if (!cancelled) {
          setError("Your session has expired. Please sign in again.");
          setLoading(false);
        }
        return;
      }

      const response = await fetch(`/.netlify/functions/report-get?id=${encodeURIComponent(params.reportId)}`, {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (cancelled) return;
      if (!response.ok) {
        setError(response.status === 404 ? "Report not found." : "Failed to load report.");
        setLoading(false);
        return;
      }

      const payload = await response.json() as ReportResponse;
      setReport(payload.report);
      setLoading(false);
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [params.reportId, user]);

  const summary = useMemo(() => {
    const json = report?.reportJson ?? {};
    const profile = record(json.profile);
    const incomeSources = records(json.incomeSources);
    const expenseProfile = record(json.expenseProfile);
    const debts = records(json.debts);
    const housingProfile = record(json.housingProfile);
    const savingsProfile = record(json.savingsProfile);
    const goals = record(json.goals);
    const rentRoomScenario = record(json.rentRoomScenario);
    const currency = String(profile?.preferred_currency ?? "USD") || "USD";

    const income = totalIncome(incomeSources);
    const nonHousingExpenses = totalExpenses(expenseProfile);
    const housing = housingPayment(housingProfile);
    const debtPayments = monthlyDebtPayments(debts);
    const totalMonthlyObligations = nonHousingExpenses + housing + debtPayments;
    const surplus = monthlySurplus(incomeSources, expenseProfile, housingProfile, debts);
    const dti = debtToIncomeRatio(debtPayments, income);
    const runway = savingsRunwayMonths(savingsProfile, expenseProfile, housingProfile);
    const debtTotal = debts.reduce((sum, debt) => sum + numberValue(debt.balance), 0);
    const equity = housingEquity(housingProfile);
    const cashSavings = numberValue(savingsProfile?.cash_savings) + numberValue(savingsProfile?.emergency_fund);

    return {
      currency,
      profile,
      incomeSources,
      expenseProfile,
      debts,
      housingProfile,
      savingsProfile,
      goals,
      rentRoomScenario,
      income,
      nonHousingExpenses,
      housing,
      debtPayments,
      totalMonthlyObligations,
      surplus,
      dti,
      runway,
      debtTotal,
      equity,
      cashSavings,
      goal: String(goals?.target_goal ?? "Missing data")
    };
  }, [report]);

  if (loading) return <div className="card text-sm text-slate-600">Loading report…</div>;

  if (error || !report) {
    return (
      <div className="space-y-4">
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">{error ?? "Report could not be loaded."}</div>
        <Link href="/app/reports" className="text-sm font-semibold text-blue-700 hover:underline">Back to reports</Link>
      </div>
    );
  }

  const csvRows = [
    ["Metric", "Value"],
    ["Report", report.title],
    ["Generated", formatDate(report.generatedAt)],
    ["Monthly Income", toCurrency(summary.income, summary.currency)],
    ["Non-housing Expenses", toCurrency(summary.nonHousingExpenses, summary.currency)],
    ["Housing Payment", toCurrency(summary.housing, summary.currency)],
    ["Debt Payments", toCurrency(summary.debtPayments, summary.currency)],
    ["Total Monthly Obligations", toCurrency(summary.totalMonthlyObligations, summary.currency)],
    ["Monthly Cash Flow", toCurrency(summary.surplus, summary.currency)],
    ["Debt-to-Income", `${Math.round(summary.dti * 100)}%`],
    ["Savings Runway", summary.runway === null ? "Missing data" : `${summary.runway.toFixed(1)} months`],
    ["Total Debt", toCurrency(summary.debtTotal, summary.currency)],
    ["Housing Equity", toCurrency(summary.equity, summary.currency)],
    ["Goal", summary.goal]
  ];

  const summaryText = `${report.title}: income ${toCurrency(summary.income, summary.currency)}, obligations ${toCurrency(summary.totalMonthlyObligations, summary.currency)}, cash flow ${toCurrency(summary.surplus, summary.currency)}, DTI ${Math.round(summary.dti * 100)}%, savings runway ${summary.runway === null ? "Missing data" : `${summary.runway.toFixed(1)} months`}, total debt ${toCurrency(summary.debtTotal, summary.currency)}.`;

  const status = {
    income: summary.income > 0 ? "Strong" : "Incomplete",
    expenses: summary.nonHousingExpenses + summary.housing > 0 ? "Strong" : "Incomplete",
    surplus: summary.income <= 0 ? "Incomplete" : summary.surplus >= 0 ? "Strong" : "Needs attention",
    runway: summary.runway === null ? "Incomplete" : summary.runway >= 3 ? "Strong" : "Needs attention",
    debt: summary.debtTotal <= 0 ? "Incomplete" : summary.dti <= 0.36 ? "Strong" : "Review carefully",
    housing: summary.housingProfile ? "Strong" : "Missing data"
  } satisfies Record<string, Status>;

  return (
    <div className="space-y-4 print:bg-white">
      <section className="card space-y-4 print:bg-white print:shadow-none">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">{report.title}</h1>
          <p className="mt-2 text-sm text-slate-600">Generated {formatDate(report.generatedAt)}. This view uses the classic report workspace style from the earlier build.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {[report.title, "Financial Snapshot", "Expense Report", "Bank Loan Readiness", "Savings & Cash Flow", "Debt & Liability", "Housing & Equity"].map((label, index) => (
            <span key={`${label}-${index}`} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium flex-none ${index === 0 ? "bg-[#0A2540] text-white" : "border border-slate-300 text-slate-600"}`}>
              {label}
            </span>
          ))}
        </div>
        <div className="border-t border-slate-200 print:hidden" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/app/reports" className="print:hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
            Back to reports
          </Link>
          <ReportActions
            reportName={report.title}
            csvRows={csvRows}
            summaryText={summaryText}
            copied={copied}
            onCopy={() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 print:bg-white">
        <div className="card md:col-span-2 print:bg-white print:shadow-none">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(summary.income, summary.currency)}</span>
            <span className="text-sm text-slate-500">monthly income</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Financial Snapshot</h2>
            <StatusBadge status={status.income} />
          </div>
          <p className="mt-2 text-sm text-slate-600">This snapshot summarizes the saved financial position at the time the report was generated.</p>
        </div>

        <SummaryCard title="Expense summary" value={toCurrency(summary.nonHousingExpenses + summary.housing, summary.currency)} helper="Housing is sourced from mortgage or rent details." status={status.expenses} />
        <SummaryCard title="Monthly surplus" value={toCurrency(summary.surplus, summary.currency)} status={status.surplus} />
        <SummaryCard title="Savings runway" value={summary.runway === null ? "Missing data" : `${summary.runway.toFixed(1)} months`} status={status.runway} />
        <SummaryCard title="Debt total" value={toCurrency(summary.debtTotal, summary.currency)} helper={`Monthly debt payments: ${toCurrency(summary.debtPayments, summary.currency)}`} status={status.debt} />
        <SummaryCard title="Housing & equity" value={toCurrency(summary.equity, summary.currency)} helper={`Housing payment: ${toCurrency(summary.housing, summary.currency)}`} status={status.housing} />
        <SummaryCard title="Goal summary" value={summary.goal} status={summary.goal === "Missing data" ? "Incomplete" : "Strong"} />
      </section>

      <DetailSection title="Income & Employment">
        <div className="grid gap-2 md:grid-cols-2">
          {summary.incomeSources.length === 0 ? <p className="text-sm text-slate-600">No income sources saved in this report.</p> : summary.incomeSources.map((income, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-[#0A2540]">{String(income.source_name ?? income.type ?? `Income Source ${index + 1}`)}</p>
              <p className="text-slate-600">{toCurrency(numberValue(income.monthly_amount), summary.currency)} monthly</p>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Debt Obligations">
        <div className="grid gap-2 md:grid-cols-2">
          {summary.debts.length === 0 ? <p className="text-sm text-slate-600">No debt records saved in this report.</p> : summary.debts.map((debt, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-[#0A2540]">{String(debt.name ?? debt.type ?? `Debt ${index + 1}`)}</p>
              <p className="text-slate-600">Balance: {toCurrency(numberValue(debt.balance), summary.currency)}</p>
              <p className="text-slate-600">Monthly payment: {toCurrency(numberValue(debt.monthly_payment ?? debt.monthlyPayment), summary.currency)}</p>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Savings & Cash Flow">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium text-[#0A2540]">Cash + emergency fund</p>
            <p className="text-slate-600">{toCurrency(summary.cashSavings, summary.currency)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium text-[#0A2540]">Monthly cash flow</p>
            <p className="text-slate-600">{toCurrency(summary.surplus, summary.currency)}</p>
          </div>
        </div>
      </DetailSection>

      <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-[#0A2540]">Show raw saved report data</summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(report.reportJson ?? null, null, 2)}</pre>
      </details>
    </div>
  );
}
