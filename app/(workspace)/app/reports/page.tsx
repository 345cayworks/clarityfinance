"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import {
  debtToIncomeRatio,
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

function ReportMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#0A2540]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useWorkspaceUser();
  const [data, setData] = useState<ProfilePayload>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
      completion,
      goal: String(goals?.target_goal ?? "Not set")
    };
  }, [data]);

  async function generate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    const token = await getIdentityToken(user);

    if (!token) {
      setGenerating(false);
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const response = await fetch("/.netlify/functions/report-create", {
      method: "POST",
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${token}` }
    });
    setGenerating(false);
    if (!response.ok) {
      setError(response.status === 401 ? "Your session has expired. Please sign in again." : "Failed to generate report.");
      return;
    }
    setMessage("Report generated.");
  }

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-white to-blue-50/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Financial report center</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Review your current financial snapshot, generate a saved report, and jump back into the profile areas that power your report.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={generating || loading}
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? "Generating…" : "Generate basic report"}
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
