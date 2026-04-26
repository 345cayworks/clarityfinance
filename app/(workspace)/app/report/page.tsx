"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import {
  debtTotal,
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

type IndicatorStatus = "Strong" | "Needs attention" | "Missing information";

function statusBadge(status: IndicatorStatus) {
  if (status === "Strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Needs attention") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

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
  const surplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null);
  const debtPayments = monthlyDebtPayments(data?.debts ?? []);
  const totalDebtAmount = debtTotal(data?.debts ?? []);
  const dti = income > 0 ? debtPayments / income : null;

  const mortgagePayment = toNumber(data?.housingProfile?.mortgage_payment);
  const rentPayment = toNumber(data?.housingProfile?.rent_amount);
  const housingPayment = mortgagePayment > 0 ? mortgagePayment : rentPayment;
  const housingPaymentRatio = income > 0 ? housingPayment / income : null;

  const homeValue = toNumber(data?.housingProfile?.estimated_home_value);
  const mortgageBalance = toNumber(data?.housingProfile?.mortgage_balance);
  const equity = homeValue - mortgageBalance;

  const cashSavings = toNumber(data?.savingsProfile?.cash_savings);
  const emergencyFund = toNumber(data?.savingsProfile?.emergency_fund);
  const runwayMonths = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null);
  const liquidity = cashSavings + emergencyFund;

  const dtiStatus: IndicatorStatus = dti === null ? "Missing information" : dti <= 0.36 ? "Strong" : "Needs attention";
  const housingRatioStatus: IndicatorStatus =
    housingPaymentRatio === null ? "Missing information" : housingPaymentRatio <= 0.30 ? "Strong" : "Needs attention";
  const runwayStatus: IndicatorStatus =
    runwayMonths === null ? "Missing information" : runwayMonths >= 3 ? "Strong" : "Needs attention";
  const surplusStatus: IndicatorStatus = income <= 0 ? "Missing information" : surplus >= 0 ? "Strong" : "Needs attention";

  const goal = String(data?.goals?.target_goal ?? "");
  const refinanceGoal = goal === "Refinance mortgage" || goal === "Cash-out refinance";

  const missingInfo = [
    { label: "Income amount", missing: income <= 0 },
    { label: "Employment type", missing: !String(data?.profile?.employment_type ?? "").trim() },
    { label: "Housing status", missing: !String(data?.housingProfile?.housing_status ?? "").trim() },
    { label: "Mortgage/rent amount", missing: housingPayment <= 0 },
    { label: "Debt balances/payments", missing: (data?.debts?.length ?? 0) === 0 },
    { label: "Savings/emergency fund", missing: cashSavings <= 0 && emergencyFund <= 0 },
    { label: "Credit profile", missing: !String(data?.profile?.credit_score_or_profile ?? "").trim() },
    { label: "Property value (refinance/cash-out)", missing: refinanceGoal && homeValue <= 0 },
    { label: "Mortgage balance (refinance/cash-out)", missing: refinanceGoal && mortgageBalance <= 0 }
  ];

  const missingCount = missingInfo.filter((item) => item.missing).length;
  const readinessScore = [dtiStatus, housingRatioStatus, runwayStatus, surplusStatus].filter((s) => s === "Strong").length;

  if (loading) return <div className="card text-sm text-slate-600">Loading bank loan readiness report…</div>;

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Bank Loan Readiness Report</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Financial Profile Report</h1>
        <p className="mt-2 text-sm text-slate-600">Professional snapshot focused on lender underwriting priorities.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="card"><h2 className="text-lg font-semibold text-[#0A2540]">1. Borrower Snapshot</h2><p className="mt-2 text-sm text-slate-600">Market: {String(data?.profile?.country_or_market ?? "Not set")}</p><p className="text-sm text-slate-600">Currency: {String(data?.profile?.preferred_currency ?? "Not set")}</p><p className="text-sm text-slate-600">Age range: {String(data?.profile?.age_range ?? "Not set")}</p></section>

        <section className="card"><h2 className="text-lg font-semibold text-[#0A2540]">2. Income & Employment</h2><p className="mt-2 text-sm text-slate-600">Employment: {String(data?.profile?.employment_type ?? "Not set")}</p><p className="text-sm text-slate-600">Household: {String(data?.profile?.household_status ?? "Not set")}</p><p className="text-sm text-slate-600">Total monthly income: {toCurrency(income)}</p></section>

        <section className="card"><h2 className="text-lg font-semibold text-[#0A2540]">3. Monthly Expenses</h2><p className="mt-2 text-sm text-slate-600">Total monthly expenses: {toCurrency(expenses)}</p><p className="text-sm text-slate-600">Monthly surplus (before debt service): {toCurrency(surplus)}</p></section>

        <section className="card"><h2 className="text-lg font-semibold text-[#0A2540]">4. Debt Obligations</h2><p className="mt-2 text-sm text-slate-600">Debt accounts: {data?.debts?.length ?? 0}</p><p className="text-sm text-slate-600">Total debt: {toCurrency(totalDebtAmount)}</p><p className="text-sm text-slate-600">Monthly debt payments: {toCurrency(debtPayments)}</p></section>

        <section className="card"><h2 className="text-lg font-semibold text-[#0A2540]">5. Housing / Property Position</h2><p className="mt-2 text-sm text-slate-600">Housing status: {String(data?.housingProfile?.housing_status ?? "Not set")}</p><p className="text-sm text-slate-600">Monthly housing payment: {toCurrency(housingPayment)}</p><p className="text-sm text-slate-600">Estimated property value: {toCurrency(homeValue)}</p><p className="text-sm text-slate-600">Mortgage balance: {toCurrency(mortgageBalance)}</p><p className="text-sm text-slate-600">Estimated equity: {toCurrency(equity)}</p></section>

        <section className="card"><h2 className="text-lg font-semibold text-[#0A2540]">6. Savings & Liquidity</h2><p className="mt-2 text-sm text-slate-600">Cash savings: {toCurrency(cashSavings)}</p><p className="text-sm text-slate-600">Emergency fund: {toCurrency(emergencyFund)}</p><p className="text-sm text-slate-600">Total liquidity: {toCurrency(liquidity)}</p><p className="text-sm text-slate-600">Savings runway: {runwayMonths === null ? "Add expenses to calculate runway." : `${runwayMonths.toFixed(1)} months`}</p></section>

        <section className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-[#0A2540]">7. Loan Readiness Indicators</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[{ label: "Debt-to-income ratio", value: dti === null ? "N/A" : `${(dti * 100).toFixed(1)}%`, status: dtiStatus }, { label: "Housing payment ratio", value: housingPaymentRatio === null ? "N/A" : `${(housingPaymentRatio * 100).toFixed(1)}%`, status: housingRatioStatus }, { label: "Savings runway", value: runwayMonths === null ? "N/A" : `${runwayMonths.toFixed(1)} months`, status: runwayStatus }, { label: "Monthly surplus", value: toCurrency(surplus), status: surplusStatus }].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-[#0A2540]">{item.label}</p>
                <p className="mt-1 text-sm text-slate-600">{item.value}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-[#0A2540]">8. Missing Information Checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {missingInfo.map((item) => (
              <li key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>{item.label}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(item.missing ? "Missing information" : "Strong")}`}>
                  {item.missing ? "Missing information" : "Strong"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-[#0A2540]">9. Clarity Summary</h2>
          <p className="mt-2 text-sm text-slate-700">
            Readiness indicators rated <strong>Strong</strong>: {readinessScore} of 4. Missing checklist items: {missingCount}.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Overall status: {readinessScore >= 3 && missingCount <= 2 ? "Strong" : missingCount > 4 ? "Missing information" : "Needs attention"}.
          </p>
          {goal === "Cash-out refinance" ? (
            <Link href="/app/tools/refinance" className="mt-3 inline-flex rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white">
              Open Cash-Out Refinance Tool
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}
