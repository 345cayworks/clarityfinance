"use client";

import { DebtBalanceChart, IncomeExpenseChart } from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import { clarityScore, debtPressureIndex, homeReadinessScore, monthlyCashFlow, totalIncome } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function DashboardPage() {
  const { data, hydrated } = useFinanceData();
  if (!hydrated) return <div className="card">Loading your plan...</div>;

  const score = clarityScore(data);
  const cashFlow = monthlyCashFlow(data);
  const debtPressure = debtPressureIndex(data);
  const readiness = homeReadinessScore(data);
  const insight = cashFlow < 0 ? "You are currently cash-flow negative. Focus on cutting expenses or increasing income." : "You have positive monthly cash flow. Next step: accelerate debt or savings goals.";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clarity Score" value={`${score}/100`} note="Overall health" />
        <MetricCard title="Monthly Cash Flow" value={`$${cashFlow.toFixed(0)}`} note="Income - outflows" />
        <MetricCard title="Debt Pressure Index" value={`${debtPressure}/100`} note="Lower is better" />
        <MetricCard title="Home Readiness" value={`${readiness}/100`} note="Estimated" />
      </div>

      <div className="card">
        <p className="text-sm text-slate-500">Top insight</p>
        <p className="mt-1 font-medium">{insight}</p>
        <p className="mt-3 text-sm text-slate-500">Recommended next step: {debtPressure > 45 ? "Pay extra toward high-interest debt." : "Increase automatic savings by 5-10%."}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IncomeExpenseChart income={totalIncome(data)} expenses={data.monthlyExpenses + data.rentAmount + data.mortgagePayment + data.debts.reduce((s, d) => s + d.monthlyPayment, 0)} />
        <DebtBalanceChart data={data.debts.map((d) => ({ name: d.name, balance: d.balance }))} />
      </div>
    </div>
  );
}
