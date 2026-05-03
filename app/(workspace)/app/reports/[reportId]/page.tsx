"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { debtToIncomeRatio, housingEquity, housingPayment, monthlyDebtPayments, monthlySurplus, savingsRunwayMonths, toCurrency, totalExpenses, totalIncome } from "@/lib/finance/calculations";

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

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#0A2540]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function JsonSection({ title, data }: { title: string; data: unknown }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-[#0A2540]">{title}</summary>
      <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(data ?? null, null, 2)}</pre>
    </details>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const { user } = useWorkspaceUser();
  const [report, setReport] = useState<ReportResponse["report"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const currency = String(profile?.preferred_currency ?? "USD") || "USD";

    const income = totalIncome(incomeSources);
    const expenses = totalExpenses(expenseProfile);
    const housing = housingPayment(housingProfile);
    const debtPayments = monthlyDebtPayments(debts);
    const surplus = monthlySurplus(incomeSources, expenseProfile, housingProfile, debts);
    const dti = debtToIncomeRatio(debtPayments, income);
    const runway = savingsRunwayMonths(savingsProfile, expenseProfile, housingProfile);
    const debtTotal = debts.reduce((sum, debt) => sum + numberValue(debt.balance), 0);
    const equity = housingEquity(housingProfile);

    return {
      currency,
      income,
      expenses,
      housing,
      debtPayments,
      surplus,
      dti,
      runway,
      debtTotal,
      equity,
      goal: String(goals?.target_goal ?? "Not set")
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

  const json = report.reportJson;

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-white to-blue-50/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Saved Report</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">{report.title}</h1>
        <p className="mt-2 text-sm text-slate-600">Generated {formatDate(report.generatedAt)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/app/reports" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to reports</Link>
          <button onClick={() => window.print()} className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e3160]">Print report</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Monthly Income" value={toCurrency(summary.income, summary.currency)} />
        <Metric label="Monthly Expenses" value={toCurrency(summary.expenses + summary.housing + summary.debtPayments, summary.currency)} hint="Living expenses, housing, and debt payments." />
        <Metric label="Monthly Cash Flow" value={toCurrency(summary.surplus, summary.currency)} />
        <Metric label="Debt-to-Income" value={`${Math.round(summary.dti * 100)}%`} />
        <Metric label="Savings Runway" value={summary.runway === null ? "Add expenses" : `${summary.runway.toFixed(1)} months`} />
        <Metric label="Total Debt" value={toCurrency(summary.debtTotal, summary.currency)} />
        <Metric label="Housing Equity" value={toCurrency(summary.equity, summary.currency)} />
        <Metric label="Goal" value={summary.goal} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <JsonSection title="Profile" data={json.profile} />
        <JsonSection title="Income Sources" data={json.incomeSources} />
        <JsonSection title="Expenses" data={json.expenseProfile} />
        <JsonSection title="Debts & Liabilities" data={json.debts} />
        <JsonSection title="Housing & Equity" data={json.housingProfile} />
        <JsonSection title="Savings & Cash Flow" data={json.savingsProfile} />
        <JsonSection title="Goals" data={json.goals} />
        <JsonSection title="Rent a Room Scenario" data={json.rentRoomScenario} />
      </div>
    </div>
  );
}
