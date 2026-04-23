"use client";

import { DebtBalanceChart, IncomeExpenseChart } from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import {
  clarityScore,
  debtPressureIndex,
  financialStabilityScore,
  homeReadinessScore,
  monthlyCashFlow,
  savingsRunwayMonths,
  totalIncome
} from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function DashboardPage() {
  const { data, hydrated } = useFinanceData();
  if (!hydrated) return <div className="card">Loading your plan...</div>;

  const score = clarityScore(data);
  const cashFlow = monthlyCashFlow(data);
  const debtPressure = debtPressureIndex(data);
  const stability = financialStabilityScore(data);
  const readiness = homeReadinessScore(data);
  const runway = savingsRunwayMonths(data);
  const insight = cashFlow < 0
    ? "You are currently cash-flow negative. Prioritize expense reduction, debt pressure, and income stability first."
    : debtPressure > 45
      ? "Debt pressure is high for your current income. A focused payoff sequence can quickly improve options."
      : "You have positive momentum. Keep compounding savings while preserving a stable monthly surplus.";

  const nextStep = data.targetGoal === "buy_home"
    ? "Improve affordability before mortgage application by increasing monthly surplus and lowering debt pressure."
    : data.targetGoal === "reduce_debt"
      ? "Direct all extra surplus to highest-interest debt until debt pressure falls below 35/100."
      : "Increase automatic savings transfers to build a stronger emergency runway.";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clarity Score" value={`${score}/100`} note="Overall" />
        <MetricCard title="Financial Stability Score" value={`${stability}/100`} note="Resilience" />
        <MetricCard title="Home Readiness Score" value={`${readiness}/100`} note="Estimated" />
        <MetricCard title="Debt Pressure Index" value={`${debtPressure}/100`} note="Lower is better" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Savings Runway" value={`${runway.toFixed(1)} months`} note="Essentials coverage" />
        <MetricCard title="Monthly Cash Flow" value={`${data.preferredCurrency} ${cashFlow.toFixed(0)}`} note="Income - outflows" />
        <MetricCard title="Market" value={data.countryOrMarket} note="Onboarding" />
      </div>

      <div className="card">
        <p className="text-sm text-slate-500">Top insight</p>
        <p className="mt-1 font-medium">{insight}</p>
        <p className="mt-3 text-sm text-slate-500">Recommended next step: {nextStep}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IncomeExpenseChart income={totalIncome(data)} expenses={data.monthlyExpenses + data.monthlyHousingCost + data.debts.reduce((s, d) => s + d.monthlyPayment, 0)} />
        <DebtBalanceChart data={data.debts.map((d) => ({ name: d.name || "Unnamed debt", balance: d.balance }))} />
      </div>
    </div>
  );
}
