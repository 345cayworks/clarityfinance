"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { DebtBreakdownChart, IncomeExpenseChart } from "@/components/charts";
import {
  clarityScore,
  debtPayoffEstimates,
  debtToIncomeRatio,
  financialStabilityScore,
  homeReadinessScore,
  monthlyCashFlow,
  savingsRunway,
  totalExpenses,
  totalIncome
} from "@/lib/calculations/finance";

type DashboardData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
} | null;

function Metric({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "info";
}) {
  const toneStyles: Record<string, string> = {
    default: "text-[#0A2540]",
    positive: "text-emerald-600",
    warning: "text-amber-600",
    info: "text-blue-600"
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (safeValue / 100) * circumference;
  return (
    <div className="relative h-24 w-24 flex-none">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#clarityGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="clarityGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold text-[#0A2540]">{Math.round(safeValue)}</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">/ 100</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/.netlify/functions/profile-get", { credentials: "same-origin" })
      .then(async (res) => (res.ok ? ((await res.json()) as Exclude<DashboardData, null>) : null))
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const incomes = (data?.incomeSources ?? []) as Array<Record<string, unknown>>;
  const expense = (data?.expenseProfile ?? null) as Record<string, unknown> | null;
  const debts = (data?.debts ?? []) as Array<Record<string, unknown>>;
  const profile = (data?.profile ?? null) as Record<string, unknown> | null;
  const savings = (data?.savingsProfile ?? null) as Record<string, unknown> | null;
  const goal = (data?.goals ?? null) as Record<string, unknown> | null;

  const income = totalIncome(incomes.map((i) => ({ monthlyAmount: Number(i.monthly_amount ?? 0) })));
  const expenses = totalExpenses(
    expense
      ? {
          housing: Number(expense.housing ?? 0),
          utilities: Number(expense.utilities ?? 0),
          transport: Number(expense.transport ?? 0),
          groceries: Number(expense.groceries ?? 0),
          insurance: Number(expense.insurance ?? 0),
          childcare: Number(expense.childcare ?? 0),
          discretionary: Number(expense.discretionary ?? 0),
          other: Number(expense.other ?? 0)
        }
      : null
  );
  const debtPayments = debts.reduce((sum, d) => sum + Number(d.monthly_payment ?? 0), 0);
  const cashFlow = monthlyCashFlow(income, expenses, debtPayments);
  const dti = debtToIncomeRatio(debtPayments, income);
  const totalSavings =
    Number(savings?.cash_savings ?? 0) +
    Number(savings?.emergency_fund ?? 0) +
    Number(savings?.investments ?? 0) +
    Number(savings?.retirement_savings ?? 0);
  const runway = savingsRunway(totalSavings, Math.max(0, expenses + debtPayments - income));
  const stability = financialStabilityScore(cashFlow, dti, runway);
  const homeReadiness = homeReadinessScore({
    downPaymentSavings: Number(savings?.down_payment_savings ?? 0),
    targetHomePrice: Number(goal?.target_home_price ?? 0),
    dti,
    creditScore: Number(profile?.credit_score_or_profile ?? 0) || null,
    isUnitedStates: String(profile?.country_or_market ?? "") === "United States"
  });
  const completionFields = [profile, incomes.length > 0, expense, debts.length > 0, data?.housingProfile, savings, goal];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
  const clarity = clarityScore(stability, homeReadiness, completion);
  const debtPlan = debtPayoffEstimates(
    debts.map((d) => ({
      name: String(d.name ?? ""),
      type: String(d.type ?? ""),
      balance: Number(d.balance ?? 0),
      monthlyPayment: Number(d.monthly_payment ?? 0),
      interestRate: Number(d.interest_rate ?? 0)
    }))
  );

  const isEmpty = !loading && !data;

  return (
    <div className="space-y-5">
      <section className="card flex flex-col gap-6 bg-gradient-to-br from-white to-blue-50/40 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <ProgressRing value={clarity || 0} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Score</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#0A2540]">
              {clarity ? "You're getting there" : "Let's build your picture"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              {completion < 100
                ? "Finish your onboarding profile to sharpen your score and unlock a tailored action plan."
                : "Your profile is complete. Run a scenario or generate your next action plan."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            Profile completion · {completion}%
          </span>
          <Link
            href={completion < 100 ? "/app/onboarding" : "/app/scenarios"}
            className="rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]"
          >
            {completion < 100 ? "Continue onboarding" : "Run a scenario"}
          </Link>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Financial Stability"
          value={stability || 0}
          hint="0–100, higher is better"
          tone="info"
        />
        <Metric
          label="Monthly Cash Flow"
          value={`$${cashFlow.toFixed(0)}`}
          tone={cashFlow >= 0 ? "positive" : "warning"}
          hint={cashFlow >= 0 ? "Surplus available" : "Negative cash flow"}
        />
        <Metric
          label="Debt Pressure"
          value={`${Math.round(dti * 100)}%`}
          tone={dti > 0.36 ? "warning" : "default"}
          hint="Debt payments / income"
        />
        <Metric label="Home Readiness" value={homeReadiness || 0} hint="0–100" tone="info" />
        <Metric label="Savings Runway" value={`${runway.toFixed(1)} mo`} tone={runway >= 3 ? "positive" : "warning"} />
        <Metric
          label="Top Insight"
          value={cashFlow < 0 ? "Cash flow is negative" : "Positive cash flow available"}
          hint={cashFlow < 0 ? "Prioritize expense and debt optimization." : "Allocate surplus toward goals faster."}
        />
        <Metric
          label="Recommended Next"
          value={completion < 100 ? "Finish onboarding" : "Lock 30-day plan"}
          hint={completion < 100 ? "Improves accuracy" : "Run a scenario first"}
        />
        <Metric label="Total Monthly Income" value={`$${income.toFixed(0)}`} tone="positive" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <IncomeExpenseChart income={income} expenses={expenses} />
        <DebtBreakdownChart totalDebt={debtPlan.totalDebt} monthlyPayment={debtPayments} />
      </div>

      {isEmpty ? (
        <div className="card text-center">
          <p className="text-sm text-slate-600">We couldn&apos;t load your profile.</p>
          <Link
            href="/app/onboarding"
            className="mt-3 inline-flex rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white"
          >
            Start onboarding
          </Link>
        </div>
      ) : null}
    </div>
  );
}
