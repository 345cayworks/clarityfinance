"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import {
  debtTotal,
  emergencyFundMonths,
  monthlyDebtPayments,
  savingsRunwayMonths,
  monthlySurplus,
  toNumber,
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

export default function ReportPage() {
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

        if (!response.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const result = (await response.json()) as ProfileData;
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

  const income = totalIncome(data?.incomeSources ?? []);
  const expenses = totalExpenses(data?.expenseProfile ?? null);
  const debtPayments = monthlyDebtPayments(data?.debts ?? []);
  const baseSurplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null);
  const surplus = baseSurplus - debtPayments;
  const totalDebt = debtTotal(data?.debts ?? []);
  const fundMonths = emergencyFundMonths(data?.savingsProfile ?? null, expenses || 1);
  const runwayMonths = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null);
  const runwayStatus =
    runwayMonths === null
      ? "Add expenses to calculate runway."
      : runwayMonths < 1
        ? "Critical: less than 1 month runway."
        : runwayMonths < 3
          ? "Needs attention: below 3 months."
          : runwayMonths < 6
            ? "Stable: 3–6 months."
            : "Strong: 6+ months.";
  const completionChecks = [
    data?.profile?.country_or_market,
    data?.incomeSources?.length,
    data?.expenseProfile,
    data?.housingProfile?.housing_status,
    data?.savingsProfile,
    data?.goals?.target_goal
  ];
  const completion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  if (loading) {
    return <div className="card text-sm text-slate-600">Loading report…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Report</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Financial profile report</h1>
        <p className="mt-2 text-sm text-slate-600">Profile completion: {completion}%</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Market & basics</h2>
          <p className="mt-2 text-sm text-slate-600">Market: {String(data?.profile?.country_or_market ?? "Not set")}</p>
          <p className="text-sm text-slate-600">Currency: {String(data?.profile?.preferred_currency ?? "Not set")}</p>
          <p className="text-sm text-slate-600">Employment: {String(data?.profile?.employment_type ?? "Not set")}</p>
          <p className="text-sm text-slate-600">Household: {String(data?.profile?.household_status ?? "Not set")}</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Income & expenses</h2>
          <p className="mt-2 text-sm text-slate-600">Total income: {toCurrency(income)}</p>
          <p className="text-sm text-slate-600">Total expenses: {toCurrency(expenses)}</p>
          <p className={`text-sm font-medium ${surplus >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
            Monthly {surplus >= 0 ? "surplus" : "deficit"}: {toCurrency(Math.abs(surplus))}
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Debt summary</h2>
          <p className="mt-2 text-sm text-slate-600">Debt accounts: {data?.debts?.length ?? 0}</p>
          <p className="text-sm text-slate-600">Total debt: {toCurrency(totalDebt)}</p>
          <p className="text-sm text-slate-600">Monthly debt payments: {toCurrency(debtPayments)}</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Housing summary</h2>
          <p className="mt-2 text-sm text-slate-600">Status: {String(data?.housingProfile?.housing_status ?? "Not set")}</p>
          <p className="text-sm text-slate-600">Rent: {toCurrency(Number(data?.housingProfile?.rent_amount ?? 0))}</p>
          <p className="text-sm text-slate-600">Mortgage payment: {toCurrency(Number(data?.housingProfile?.mortgage_payment ?? 0))}</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Savings summary</h2>
          <p className="mt-2 text-sm text-slate-600">Cash savings: {toCurrency(Number(data?.savingsProfile?.cash_savings ?? 0))}</p>
          <p className="text-sm text-slate-600">Emergency fund: {toCurrency(Number(data?.savingsProfile?.emergency_fund ?? 0))}</p>
          <p className="text-sm text-slate-600">Emergency fund coverage: {fundMonths.toFixed(1)} months</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Goal summary</h2>
          <p className="mt-2 text-sm text-slate-600">Top goal: {String(data?.goals?.target_goal ?? "Not set")}</p>
          <p className="text-sm text-slate-600">Timeframe: {String(data?.goals?.goal_timeframe ?? "Not set")}</p>
          <p className="text-sm text-slate-600">Target home price: {toCurrency(Number(data?.goals?.target_home_price ?? 0))}</p>
          {String(data?.goals?.target_goal ?? "") === "Cash-out refinance" ? (
            <Link href="/app/tools/refinance" className="mt-3 inline-flex rounded-lg bg-[#0A2540] px-3 py-1.5 text-xs font-semibold text-white">
              Open Cash-Out Refinance Tool
            </Link>
          ) : null}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Savings Runway</h2>
          <p className="mt-2 text-sm text-slate-600">Cash savings: {toCurrency(toNumber(data?.savingsProfile?.cash_savings))}</p>
          <p className="text-sm text-slate-600">Emergency fund: {toCurrency(toNumber(data?.savingsProfile?.emergency_fund))}</p>
          <p className="text-sm text-slate-600">Monthly expenses: {toCurrency(expenses)}</p>
          <p className="text-sm text-slate-600">
            Estimated runway: {runwayMonths === null ? "N/A" : `${runwayMonths.toFixed(1)} months`}
          </p>
          <p className="text-sm font-medium text-slate-700">{runwayStatus}</p>
        </div>
      </div>
    </div>
  );
}
