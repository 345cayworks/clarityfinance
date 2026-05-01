"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { DebtBreakdownChart, IncomeExpenseChart } from "@/components/charts";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { AdvisorCta } from "@/components/advisor/advisor-cta";
import { getAdvisorRecommendation } from "@/lib/advisor/recommendations";
import {
  clarityScore,
  debtPayoffEstimates,
  debtToIncomeRatio,
  financialStabilityScore,
  housingPayment,
  homeReadinessScore,
  savingsRunwayMonths,
  toCurrency,
  totalExpenses,
  totalIncome
} from "@/lib/finance/calculations";

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
  tone = "default",
  prominent = false
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "info";
  prominent?: boolean;
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
      <p className={`mt-2 ${prominent ? "text-3xl" : "text-2xl"} font-semibold ${toneStyles[tone]}`}>{value}</p>
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
  const { user } = useWorkspaceUser();

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = await getIdentityToken(user);
      if (!token) return null;

      const res = await fetch("/.netlify/functions/profile-get", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });

      return res.ok ? ((await res.json()) as Exclude<DashboardData, null>) : null;
    }

    loadProfile()
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
  }, [user]);

  const incomes = (data?.incomeSources ?? []) as Array<Record<string, unknown>>;
  const expense = (data?.expenseProfile ?? null) as Record<string, unknown> | null;
  const debts = (data?.debts ?? []) as Array<Record<string, unknown>>;
  const profile = (data?.profile ?? null) as Record<string, unknown> | null;
  const savings = (data?.savingsProfile ?? null) as Record<string, unknown> | null;
  const goal = (data?.goals ?? null) as Record<string, unknown> | null;
  const housing = (data?.housingProfile ?? null) as Record<string, unknown> | null;

  const monthlyIncome = totalIncome(incomes);
  const nonHousingLivingExpenses = totalExpenses(expense);
  const housingExpense = housingPayment(housing);
  const totalLivingExpenseAmount = nonHousingLivingExpenses + housingExpense;
  const monthlyDebtPayments = debts.reduce((sum, d) => sum + Number(d.monthly_payment ?? 0), 0);
  const totalMonthlyObligationsAmount = totalLivingExpenseAmount + monthlyDebtPayments;
  const monthlySurplus = monthlyIncome - totalMonthlyObligationsAmount;
  const dti = debtToIncomeRatio(monthlyDebtPayments, monthlyIncome);
  const housingRatio = monthlyIncome > 0 ? housingExpense / monthlyIncome : 0;
  const totalMonthlyPressure = monthlyIncome > 0 ? totalMonthlyObligationsAmount / monthlyIncome : 0;
  const totalSavings =
    Number(savings?.cash_savings ?? 0) +
    Number(savings?.emergency_fund ?? 0) +
    Number(savings?.investments ?? 0) +
    Number(savings?.retirement_savings ?? 0);
  const runway = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null);
  const cashAndEmergency = Number(savings?.cash_savings ?? 0) + Number(savings?.emergency_fund ?? 0);
  const runwaySupportingText =
    runway === null
      ? "Complete expenses and savings to calculate runway."
      : runway < 1
        ? "Critical: less than 1 month of expenses covered."
        : runway < 3
          ? "Needs attention: below 3 months."
          : runway < 6
            ? "Stable: 3–6 months."
            : "Strong: 6+ months.";
  const runwayValue = runway === null ? "Add expenses" : `${runway.toFixed(1)} months`;
  const stability = financialStabilityScore(monthlySurplus, dti, runway ?? 0);
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

  const advisorRecommendation = getAdvisorRecommendation({approvalScore: clarity, dti, monthlySurplus, savingsRunwayMonths: runway ?? 0, goal: String(goal?.target_goal ?? "")});
  const isEmpty = !loading && !data;

  return (
    <div className="space-y-5">
      {advisorRecommendation.shouldRecommend ? <AdvisorCta context="dashboard" title="Request Advisor Review" description="Your profile has items a bank may question. Request an advisor review before submitting." recommendedPackage={advisorRecommendation.package} urgencyLevel={advisorRecommendation.urgency} /> : null}
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
          prominent
        />
        <Metric
          label="Monthly Cash Flow"
          value={`$${monthlySurplus.toFixed(0)}`}
          tone={monthlySurplus >= 0 ? "positive" : "warning"}
          hint="Income after living expenses, housing, and debt payments"
          prominent
        />
        <Metric
          label="Debt-to-Income"
          value={`${Math.round(dti * 100)}%`}
          tone={dti > 0.36 ? "warning" : "default"}
          hint="Debt payments only"
          prominent
        />
        <Metric
          label="Total Monthly Pressure"
          value={`${Math.round(totalMonthlyPressure * 100)}%`}
          tone={totalMonthlyPressure > 0.75 ? "warning" : "info"}
          hint="Living expenses + housing + debt payments / income"
          prominent
        />
        <Metric label="Home Readiness" value={homeReadiness || 0} hint="0–100" tone="info" prominent />
        <Metric
          label="Savings Runway"
          value={runwayValue}
          tone={runway !== null && runway >= 3 ? "positive" : "warning"}
          hint={`${runwaySupportingText} Cash + emergency: ${toCurrency(cashAndEmergency)}.`}
        />
        <div className="card border-l-4 border-blue-500 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Top insight
          </p>
          <p className="mt-1 text-sm font-semibold text-[#0A2540]">
            {monthlySurplus < 0
              ? "Cash flow is negative — prioritize expense and debt optimization."
              : "Positive cash flow available — allocate surplus toward goals faster."}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Recommended next
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {completion < 100
              ? "Finish your onboarding profile to improve score accuracy."
              : "Run a scenario to model your next financial move."}
          </p>
        </div>
        <Metric label="Total Monthly Income" value={`$${monthlyIncome.toFixed(0)}`} tone="positive" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <IncomeExpenseChart income={monthlyIncome} expenses={totalMonthlyObligationsAmount} />
        <DebtBreakdownChart totalDebt={debtPlan.totalDebt} monthlyPayment={monthlyDebtPayments} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Monthly obligations breakdown</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p>Non-housing living expenses: {toCurrency(nonHousingLivingExpenses)}</p>
            <p>Housing expense: {toCurrency(housingExpense)}</p>
            <p>Debt payments: {toCurrency(monthlyDebtPayments)}</p>
            <p className="font-semibold text-[#0A2540]">Total monthly obligations: {toCurrency(totalMonthlyObligationsAmount)}</p>
            <p>Housing ratio: {Math.round(housingRatio * 100)}%</p>
          </div>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Obligations context</p>
          <p className="mt-2 text-sm text-slate-600">
            Your monthly pressure combines living expenses, housing, and debt servicing against income.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/app/report" className="card transition-colors hover:border-blue-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Report</p>
          <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">View financial report</h3>
          <p className="mt-1 text-sm text-slate-600">See your profile summary, cash flow, debt, savings, and goals in one place.</p>
        </Link>
        <Link href="/app/action-plan" className="card transition-colors hover:border-blue-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Action plan</p>
          <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Open action plan</h3>
          <p className="mt-1 text-sm text-slate-600">Get practical next steps based on your current profile and financial goal.</p>
        </Link>
        <Link href="/app/onboarding" className="card transition-colors hover:border-blue-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Profile</p>
          <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Update onboarding profile</h3>
          <p className="mt-1 text-sm text-slate-600">Review and refresh your baseline data to keep insights accurate.</p>
        </Link>
        <Link href="/app/tools/mortgage" className="card transition-colors hover:border-blue-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tool</p>
          <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Mortgage Calculator</h3>
          <p className="mt-1 text-sm text-slate-600">Estimate mortgage payments and bank-readiness.</p>
        </Link>
        <Link href="/app/tools/rent-a-room" className="card transition-colors hover:border-blue-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tool</p>
          <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Rent-a-Room Tool</h3>
          <p className="mt-1 text-sm text-slate-600">Estimate room prep costs, rental income, and break-even timeline.</p>
        </Link>
        {String(goal?.target_goal ?? "") === "Cash-out refinance" ? (
          <Link href="/app/tools/refinance" className="card transition-colors hover:border-blue-300 md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Recommended Tool</p>
            <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">Cash-Out Refinance Tool</h3>
            <p className="mt-1 text-sm text-slate-600">
              Compare proposed loan terms, payment impact, LTV, and net cash before deciding.
            </p>
          </Link>
        ) : null}
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
