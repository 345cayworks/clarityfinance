"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import {
  emergencyFundMonths,
  housingEquity,
  monthlyDebtPayments,
  savingsRunwayMonths,
  monthlySurplus,
  toCurrency,
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

export default function ActionPlanPage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const token = await getIdentityToken(user);
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }

        const response = await fetch("/.netlify/functions/profile-get", {
          credentials: "same-origin",
          headers: { Authorization: `Bearer ${token}` }
        });

        const result = response.ok ? ((await response.json()) as ProfileData) : null;
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = useMemo(() => {
    const plan: string[] = [];
    const income = totalIncome(data?.incomeSources ?? []);
    const expenses = totalExpenses(data?.expenseProfile ?? null);
    const debtPayments = monthlyDebtPayments(data?.debts ?? []);
    const surplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null) - debtPayments;
    const fundMonths = emergencyFundMonths(data?.savingsProfile ?? null, Math.max(1, expenses));
    const runwayMonths = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null);
    const goal = String(data?.goals?.target_goal ?? "");

    if (expenses > income) {
      plan.push("Run a line-by-line expense review this week and cut or renegotiate at least two recurring costs.");
    }

    if (fundMonths < 3) {
      const targetEmergencyFund = expenses * 3;
      plan.push(`Build emergency savings toward ${toCurrency(targetEmergencyFund)} (about 3 months of expenses).`);
    }

    if (runwayMonths !== null && runwayMonths < 1) {
      plan.push("Urgent: create a cash buffer plan for the next 30 days and pause non-essential discretionary spending.");
    } else if (runwayMonths !== null && runwayMonths < 3) {
      plan.push("Increase emergency fund contributions until you reach at least 3 months of expenses.");
    } else if (runwayMonths !== null && runwayMonths < 6) {
      plan.push("You are stable at 3–6 months runway; continue building toward a 6-month emergency buffer.");
    } else if (runwayMonths !== null && runwayMonths >= 6) {
      plan.push("Maintain your 6+ month buffer and direct excess cash toward goals, debt reduction, or long-term investments.");
    }

    if ((data?.debts.length ?? 0) > 0) {
      plan.push("Prioritize debt payoff by highest interest rate first while maintaining all minimum payments.");
    }

    if (goal === "Rent out a room") {
      plan.push("Confirm local rental rules, estimate market rent, and list room prep costs before advertising.");
      plan.push("Create a screening checklist and lease template to reduce vacancy and payment risk.");
    }

    if (goal === "Refinance mortgage") {
      plan.push("Gather last 2 years of income docs and current mortgage statement to confirm refinance readiness.");
      plan.push("Check credit profile and compare lender offers for rate + closing costs before locking.");
    }

    if (goal === "Cash-out refinance") {
      const homeValue = Number(data?.housingProfile?.estimated_home_value ?? 0);
      const mortgageBalance = Number(data?.housingProfile?.mortgage_balance ?? 0);
      const equity = housingEquity(data?.housingProfile ?? null);
      plan.push(`Estimate home value (current estimate: ${toCurrency(homeValue)}).`);
      plan.push(`Confirm current mortgage balance (saved balance: ${toCurrency(mortgageBalance)}).`);
      plan.push(`Calculate available equity (estimated: ${toCurrency(equity)}).`);
      plan.push(`Review current mortgage rate (saved rate: ${Number(data?.housingProfile?.mortgage_rate ?? 0).toFixed(2)}%).`);
      plan.push("Compare cash-out proceeds against monthly payment impact using at least 2 lender scenarios.");
      plan.push("Use proceeds only for high-value purposes: debt consolidation, home improvements, or income-producing investment.");
    }

    if (goal === "Save for home purchase" || goal === "Prepare for mortgage") {
      plan.push("Set a monthly down-payment transfer and keep debt-to-income ratio trending below lender thresholds.");
      plan.push("Track credit profile monthly and avoid opening new debt before mortgage pre-approval.");
    }

    if (surplus > 0) {
      plan.push(`Auto-transfer ${toCurrency(Math.max(100, surplus * 0.4))} monthly toward your top goal.`);
    }

    if (plan.length < 5) {
      plan.push("Review your income stability and identify one additional income opportunity for the next 60 days.");
      plan.push("Set a monthly money check-in and compare actual vs planned spending categories.");
    }

    return plan.slice(0, 8);
  }, [data]);

  if (loading) return <div className="card text-sm text-slate-600">Loading action plan…</div>;
  const isCashOutGoal = String(data?.goals?.target_goal ?? "") === "Cash-out refinance";

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Roadmap</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Action plan</h1>
        <p className="mt-2 text-sm text-slate-600">A practical 5–8 step plan based on your current profile.</p>
        {isCashOutGoal ? (
          <Link href="/app/tools/refinance" className="mt-3 inline-flex rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white">
            Open Cash-Out Refinance Tool
          </Link>
        ) : null}
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={`${step}-${index}`} className="card flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {index + 1}
            </span>
            <p className="text-sm text-slate-700">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
