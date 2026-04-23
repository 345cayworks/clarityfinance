"use client";

import { useMemo } from "react";
import { CashFlowChart } from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import { clarityScore, debtPressureIndex, homeReadinessScore, monthlyCashFlow } from "@/lib/calculations";
import { Debt, FinancialProfile } from "@/types";

const profile: FinancialProfile = {
  monthlyIncome: 7200,
  monthlyExpenses: 3600,
  savings: 18000,
  creditScoreRange: "670-739",
  housingStatus: "renting"
};

const debts: Debt[] = [
  { name: "Auto Loan", balance: 14000, interestRate: 5.2, monthlyPayment: 380 },
  { name: "Credit Card", balance: 6400, interestRate: 21.5, monthlyPayment: 240 }
];

export default function DashboardPage() {
  const metrics = useMemo(() => {
    const c = clarityScore(profile, debts);
    const cash = monthlyCashFlow(profile, debts);
    const pressure = debtPressureIndex(profile, debts);
    const readiness = homeReadinessScore(profile, debts);
    return { c, cash, pressure, readiness };
  }, []);

  const data = [
    { month: "Jan", cashFlow: metrics.cash - 300 },
    { month: "Feb", cashFlow: metrics.cash - 150 },
    { month: "Mar", cashFlow: metrics.cash + 50 },
    { month: "Apr", cashFlow: metrics.cash },
    { month: "May", cashFlow: metrics.cash + 125 },
    { month: "Jun", cashFlow: metrics.cash + 200 }
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Know where you stand. Know what’s next.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clarity Score" value={`${metrics.c}/100`} />
        <MetricCard title="Monthly Cash Flow" value={`$${metrics.cash.toLocaleString()}`} tone="teal" />
        <MetricCard title="Debt Pressure Index" value={`${metrics.pressure}/100`} />
        <MetricCard title="Home Readiness Score" value={`${metrics.readiness}/100`} tone="teal" />
      </div>

      <CashFlowChart data={data} />
    </section>
  );
}
