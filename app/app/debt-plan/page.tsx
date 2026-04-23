"use client";

import { debtPayoffEstimateMonths, totalDebtBalance, totalDebtPayment } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function DebtPlanPage() {
  const { data } = useFinanceData();
  const totalBalance = totalDebtBalance(data.debts);
  const months = debtPayoffEstimateMonths(data.debts);
  const avalanche = [...data.debts].sort((a, b) => b.interestRate - a.interestRate);
  const snowball = [...data.debts].sort((a, b) => a.balance - b.balance);

  return (
    <div className="space-y-4">
      <div className="card">
        <p>Total debt: <strong>{data.preferredCurrency} {totalBalance.toFixed(0)}</strong></p>
        <p>Total monthly payment: <strong>{data.preferredCurrency} {totalDebtPayment(data.debts).toFixed(0)}</strong></p>
        <p>Estimated payoff timeline: <strong>{months === Infinity ? "Payment too low to amortize" : `${months} months`}</strong></p>
        {data.debts.length === 0 ? <p className="mt-2 text-sm text-slate-500">Empty state: add debts in onboarding to build payoff sequencing.</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card"><h2 className="font-semibold">Avalanche (highest APR first)</h2><ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{avalanche.map((d) => <li key={d.id}>{d.name || "Unnamed debt"} ({d.interestRate}%)</li>)}</ul></div>
        <div className="card"><h2 className="font-semibold">Snowball (smallest balance first)</h2><ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{snowball.map((d) => <li key={d.id}>{d.name || "Unnamed debt"} ({data.preferredCurrency} {d.balance.toFixed(0)})</li>)}</ul></div>
      </div>
      <p className="text-sm text-slate-500">Assumptions used: payoff timeline is a blended-interest estimate, not a lender-grade amortization schedule.</p>
    </div>
  );
}
