"use client";

import { mortgageAffordability, totalDebtPayment, totalIncome } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function MortgagePage() {
  const { data } = useFinanceData();
  const result = mortgageAffordability(data);

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">Mortgage affordability</h1>
        <p className="mt-2 text-sm text-slate-600">Estimated affordable housing payment: <strong>${result.maxHousingPayment.toFixed(0)}/mo</strong></p>
        <p className="text-sm text-slate-600">Estimated home price range: <strong>${result.lowHomePrice.toFixed(0)} - ${result.highHomePrice.toFixed(0)}</strong></p>
      </div>
      <p className="text-sm text-slate-500">Assumptions used: max DTI 43%, 30-year fixed at 6.75% estimate, debt payments = ${totalDebtPayment(data.debts).toFixed(0)}/mo, income = ${totalIncome(data).toFixed(0)}/mo.</p>
    </div>
  );
}
