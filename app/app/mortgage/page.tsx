"use client";

import { mortgageAffordability, totalDebtPayment, totalIncome } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function MortgagePage() {
  const { data } = useFinanceData();
  const result = mortgageAffordability(data);

  if (totalIncome(data) <= 0) {
    return <div className="card">Add income in onboarding to unlock mortgage readiness estimates.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">Mortgage affordability</h1>
        <p className="mt-2 text-sm text-slate-600">Estimated affordable housing payment: <strong>{data.preferredCurrency} {result.maxHousingPayment.toFixed(0)}/mo</strong></p>
        <p className="text-sm text-slate-600">Estimated home price range: <strong>{data.preferredCurrency} {result.lowHomePrice.toFixed(0)} - {data.preferredCurrency} {result.highHomePrice.toFixed(0)}</strong></p>
        <p className="mt-2 text-sm text-slate-500">Mode: {result.mode === "us_dti" ? "U.S. DTI-style estimate" : "International / no-credit stability estimate"}</p>
      </div>
      <p className="text-sm text-slate-500">Assumptions used: {result.mode === "us_dti" ? "DTI-based cap with 30-year fixed 6.75% estimate and credit profile influence." : "Cash-flow and stability-oriented cap with conservative 30-year 8.5% estimate for non-U.S./no-credit cases."} Debt payments = {data.preferredCurrency} {totalDebtPayment(data.debts).toFixed(0)}/mo, income = {data.preferredCurrency} {totalIncome(data).toFixed(0)}/mo.</p>
    </div>
  );
}
