"use client";

import type { Route } from "next";
import Link from "next/link";
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

type ProfilePayload = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
} | null;

type SavedReport = {
  id: string;
  title: string;
  reportType: string;
  generatedAt: string | null;
};

type ReportDefinition = {
  type: string;
  title: string;
  description: string;
  primaryMetric: string;
  secondaryMetric: string;
  status: string;
  href: Route;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ReportMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#0A2540]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ReportCard({ report, generatingType, onGenerate }: { report: ReportDefinition; generatingType: string | null; onGenerate: (reportType: string, title: string) => void }) {
  const isGenerating = generatingType === report.type;
  return (
    <div className="card flex h-full flex-col justify-between gap-4 transition-colors hover:border-blue-300">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Report</p>
        <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">{report.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{report.description}</p>
        <div className="mt-4 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-[#0A2540]">{report.primaryMetric}</p>
          <p className="text-slate-600">{report.secondaryMetric}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{report.status}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onGenerate(report.type, report.title)}
          disabled={Boolean(generatingType)}
          className="rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isGenerating ? "Generating…" : "Generate"}
        </button>
        <Link href={report.href} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Review source
        </Link>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useWorkspaceUser();
  const [data, setData] = useState<ProfilePayload>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  async function loadSavedReports(token: string) {
    const response = await fetch("/.netlify/functions/reports-list", {
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const payload = await response.json() as { reports?: SavedReport[] };
      setSavedReports(payload.reports ?? []);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadReportDashboard() {
      setLoading(true);
      setError(null);
      const token = await getIdentityToken(user);

      if (!token) {
        if (!cancelled) {
          setLoading(false);
          setError("Your session has expired. Please sign in again.");
        }
        return;
      }

      const response = await fetch("/.netlify/functions/profile-get", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!cancelled) {
        if (response.ok) {
          setData((await response.json()) as Exclude<ProfilePayload, null>);
          await loadSavedReports(token);
        } else {
          setError(response.status === 401 ? "Your session has expired. Please sign in again." : "Failed to load report dashboard data.");
        }
        setLoading(false);
      }
    }

    void loadReportDashboard();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const metrics = useMemo(() => {
    const incomeSources = data?.incomeSources ?? [];
    const expenseProfile = data?.expenseProfile ?? null;
    const debts = data?.debts ?? [];
    const housingProfile = data?.housingProfile ?? null;
    const savingsProfile = data?.savingsProfile ?? null;
    const profile = data?.profile ?? null;
    const goals = data?.goals ?? null;
    const currency = String(profile?.preferred_currency ?? "USD") || "USD";

    const income = totalIncome(incomeSources);
    const livingExpenses = totalExpenses(expenseProfile);
    const housing = housingPayment(housingProfile);
    const debtPayments = monthlyDebtPayments(debts);
    const obligations = livingExpenses + housing + debtPayments;
    const surplus = monthlySurplus(incomeSources, expenseProfile, housingProfile, debts);
    const dti = debtToIncomeRatio(debtPayments, income);
    const runway = savingsRunwayMonths(savingsProfile, expenseProfile, housingProfile);
    const debtTotal = debts.reduce((sum, debt) => sum + numberValue(debt.balance), 0);
    const cashSavings = numberValue(savingsProfile?.cash_savings) + numberValue(savingsProfile?.emergency_fund);
    const equity = housingEquity(housingProfile);
    const estimatedHomeValue = numberValue(housingProfile?.estimated_home_value);
    const mortgageBalance = numberValue(housingProfile?.mortgage_balance);
    const estimatedRoomRent = numberValue(housingProfile?.estimated_room_rental_income);
    const completionFields = [profile, incomeSources.length > 0, expenseProfile, debts.length > 0, housingProfile, savingsProfile, goals];
    const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

    return {
      currency,
      income,
      livingExpenses,
      housing,
      debtPayments,
      obligations,
      surplus,
      dti,
      runway,
      debtTotal,
      cashSavings,
      equity,
      estimatedHomeValue,
      mortgageBalance,
      estimatedRoomRent,
      completion,
      debtCount: debts.length,
      goal: String(goals?.target_goal ?? "Not set")
    };
  }, [data]);

  const reports = useMemo<ReportDefinition[]>(() => [
    {
      type: "financial_snapshot",
      title: "Financial Snapshot",
      description: "A high-level picture of income, obligations, cash flow, savings runway, and current goal.",
      primaryMetric: `Profile completion: ${metrics.completion}%`,
      secondaryMetric: `Cash flow: ${toCurrency(metrics.surplus, metrics.currency)} / month`,
      status: metrics.completion >= 80 ? "Strong report readiness" : "Complete profile for stronger accuracy",
      href: "/app/onboarding"
    },
    {
      type: "expense_report",
      title: "Expense Report",
      description: "Breakdown of non-housing living expenses, housing payment, debt payments, and total monthly pressure.",
      primaryMetric: `Living expenses: ${toCurrency(metrics.livingExpenses, metrics.currency)}`,
      secondaryMetric: `Total obligations: ${toCurrency(metrics.obligations, metrics.currency)}`,
      status: metrics.income > 0 && metrics.obligations / metrics.income > 0.75 ? "High monthly pressure" : "Expense profile ready",
      href: "/app/onboarding"
    },
    {
      type: "bank_loan_readiness",
      title: "Bank Loan Readiness Report",
      description: "Lender-facing summary of income, debt-to-income, housing costs, savings, and readiness indicators.",
      primaryMetric: `DTI: ${Math.round(metrics.dti * 100)}%`,
      secondaryMetric: `Monthly income: ${toCurrency(metrics.income, metrics.currency)}`,
      status: metrics.dti > 0.36 ? "Review before submission" : "Bank-readiness inputs available",
      href: "/app/loan-readiness"
    },
    {
      type: "loan_document_checklist",
      title: "Loan Document Checklist",
      description: "Checklist-driven view of documents needed for prequalification, lender review, and advisor follow-up.",
      primaryMetric: `Current goal: ${metrics.goal}`,
      secondaryMetric: `Profile completion: ${metrics.completion}%`,
      status: "Review document gaps before applying",
      href: "/app/prequalification/proven-bank"
    },
    {
      type: "rent_a_room_scenario",
      title: "Rent a Room Scenario Report",
      description: "Scenario report for rental income potential, setup costs, added monthly costs, and break-even planning.",
      primaryMetric: `Estimated room rent: ${toCurrency(metrics.estimatedRoomRent, metrics.currency)}`,
      secondaryMetric: `Goal match: ${metrics.goal === "Rent out a room" ? "Yes" : "Not selected"}`,
      status: metrics.estimatedRoomRent > 0 ? "Rental income input available" : "Add room rental assumptions",
      href: "/app/tools/rent-a-room"
    },
    {
      type: "savings_cash_flow",
      title: "Savings & Cash Flow Report",
      description: "Focused report on monthly surplus, emergency reserves, cash savings, and runway strength.",
      primaryMetric: `Savings runway: ${metrics.runway === null ? "Add expenses" : `${metrics.runway.toFixed(1)} months`}`,
      secondaryMetric: `Cash + emergency: ${toCurrency(metrics.cashSavings, metrics.currency)}`,
      status: metrics.runway !== null && metrics.runway >= 3 ? "Healthy cash buffer" : "Build emergency reserve",
      href: "/app/action-plan"
    },
    {
      type: "debt_liability",
      title: "Debt & Liability Report",
      description: "Summary of balances, monthly debt payments, and debt pressure for payoff planning.",
      primaryMetric: `Total debt: ${toCurrency(metrics.debtTotal, metrics.currency)}`,
      secondaryMetric: `Monthly debt payments: ${toCurrency(metrics.debtPayments, metrics.currency)}`,
      status: metrics.debtCount > 0 ? `${metrics.debtCount} debt record(s) included` : "No debt records saved",
      href: "/app/tools/debt-plan" as Route
    },
    {
      type: "housing_equity",
      title: "Housing & Equity Report",
      description: "Housing report showing mortgage or rent payment, home value, mortgage balance, and estimated equity.",
      primaryMetric: `Estimated equity: ${toCurrency(metrics.equity, metrics.currency)}`,
      secondaryMetric: `Home value: ${toCurrency(metrics.estimatedHomeValue, metrics.currency)} · Mortgage: ${toCurrency(metrics.mortgageBalance, metrics.currency)}`,
      status: metrics.estimatedHomeValue > 0 ? "Housing profile available" : "Add housing value for equity analysis",
      href: "/app/onboarding"
    }
  ], [metrics]);

  async function generate(reportType = "financial_snapshot", reportTitle = "Financial Snapshot") {
    setGeneratingType(reportType);
    setError(null);
    setMessage(null);
    const token = await getIdentityToken(user);

    if (!token) {
      setGeneratingType(null);
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const response = await fetch("/.netlify/functions/report-create", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reportType })
    });
    setGeneratingType(null);
    if (!response.ok) {
      setError(response.status === 401 ? "Your session has expired. Please sign in again." : `Failed to generate ${reportTitle}.`);
      return;
    }
    const payload = await response.json() as { reportId?: string };
    await loadSavedReports(token);
    setMessage(`${reportTitle} generated.`);
    if (payload.reportId) {
      window.location.href = `/app/reports/${payload.reportId}`;
    }
  }

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-white to-blue-50/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Financial report center</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Generate targeted financial reports from your saved profile, loan-readiness inputs, housing details, debt records, and rent-a-room scenarios.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void generate()}
            disabled={Boolean(generatingType) || loading}
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generatingType === "financial_snapshot" ? "Generating…" : "Generate Financial Snapshot"}
          </button>
          <Link href="/app/onboarding" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Update profile data
          </Link>
          <Link href="/app/action-plan" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Open action plan
          </Link>
          {message ? (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">{message}</span>
          ) : null}
          {error ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">{error}</span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="card text-sm text-slate-600">Loading report dashboard…</div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ReportMetric label="Profile Completion" value={`${metrics.completion}%`} hint="Report accuracy improves as profile data is completed." />
            <ReportMetric label="Monthly Income" value={toCurrency(metrics.income, metrics.currency)} hint="Based on saved income sources." />
            <ReportMetric label="Monthly Obligations" value={toCurrency(metrics.obligations, metrics.currency)} hint="Living expenses, housing, and debt payments." />
            <ReportMetric label="Monthly Cash Flow" value={toCurrency(metrics.surplus, metrics.currency)} hint="Income after obligations." />
            <ReportMetric label="Debt-to-Income" value={`${Math.round(metrics.dti * 100)}%`} hint="Debt payments divided by income." />
            <ReportMetric label="Savings Runway" value={metrics.runway === null ? "Add expenses" : `${metrics.runway.toFixed(1)} months`} hint="Cash and emergency savings coverage." />
            <ReportMetric label="Housing Payment" value={toCurrency(metrics.housing, metrics.currency)} hint="Rent or mortgage payment from housing profile." />
            <ReportMetric label="Current Goal" value={metrics.goal} hint="Primary saved financial objective." />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Available Reports</p>
              <h2 className="mt-1 text-xl font-semibold text-[#0A2540]">Choose the report you need</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reports.map((report) => (
                <ReportCard key={report.type} report={report} generatingType={generatingType} onGenerate={(type, title) => void generate(type, title)} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Saved Reports</p>
                <h2 className="mt-1 text-xl font-semibold text-[#0A2540]">Recent generated reports</h2>
              </div>
            </div>
            {savedReports.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No saved reports yet. Generate a report above to view it here.</p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {savedReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/app/reports/${report.id}` as Route}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-[#0A2540]">{report.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(report.generatedAt)}</p>
                    </div>
                    <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">View report</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/app/report" className="card transition-colors hover:border-blue-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Legacy Route</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">/app/report reconnects here</h3>
              <p className="mt-1 text-sm text-slate-600">The old report route redirects to this reports dashboard.</p>
            </Link>
            <Link href="/app/loan-readiness" className="card transition-colors hover:border-blue-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Premium Report Input</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Loan readiness</h3>
              <p className="mt-1 text-sm text-slate-600">Update readiness data used for lender-facing reporting.</p>
            </Link>
            <Link href="/app/prequalification/proven-bank" className="card transition-colors hover:border-blue-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Bank View</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Proven Bank prequalification</h3>
              <p className="mt-1 text-sm text-slate-600">Review the bank-oriented prequalification questionnaire.</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
