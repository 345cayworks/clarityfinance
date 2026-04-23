"use client";

import { useState } from "react";
import { applyScenario, clarityScore } from "@/lib/calculations";
import { Debt, FinancialProfile, ScenarioInput } from "@/types";

const baseProfile: FinancialProfile = {
  monthlyIncome: 7000,
  monthlyExpenses: 3900,
  savings: 14000,
  creditScoreRange: "670-739",
  housingStatus: "renting"
};

const baseDebts: Debt[] = [
  { name: "Personal Loan", balance: 12000, interestRate: 12, monthlyPayment: 310 },
  { name: "Credit Card", balance: 6800, interestRate: 22, monthlyPayment: 240 }
];

export default function ScenarioPage() {
  const [scenario, setScenario] = useState<ScenarioInput>({
    incomeDelta: 500,
    debtReduction: 2000,
    rentalIncome: 700,
    interestRateReduction: 1.5
  });

  const beforeScore = clarityScore(baseProfile, baseDebts);
  const projected = applyScenario(baseProfile, baseDebts, scenario);
  const afterScore = clarityScore(projected.profile, projected.debts);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Scenario Engine</h1>
      <p className="text-slate-600">Simulate income growth, debt reduction, rental income, and rate improvements.</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Increased Income</label><input className="input" type="number" value={scenario.incomeDelta} onChange={(e)=>setScenario({ ...scenario, incomeDelta: Number(e.target.value) })} /></div>
        <div><label className="label">Reduced Debt (Total)</label><input className="input" type="number" value={scenario.debtReduction} onChange={(e)=>setScenario({ ...scenario, debtReduction: Number(e.target.value) })} /></div>
        <div><label className="label">Rental Income</label><input className="input" type="number" value={scenario.rentalIncome} onChange={(e)=>setScenario({ ...scenario, rentalIncome: Number(e.target.value) })} /></div>
        <div><label className="label">Lower Interest Rates (%)</label><input className="input" type="number" value={scenario.interestRateReduction} onChange={(e)=>setScenario({ ...scenario, interestRateReduction: Number(e.target.value) })} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="card"><h2 className="text-lg font-semibold">Current Clarity Score</h2><p className="mt-2 text-4xl font-bold text-brandBlue">{beforeScore}</p></article>
        <article className="card"><h2 className="text-lg font-semibold">Projected Clarity Score</h2><p className="mt-2 text-4xl font-bold text-brandTeal">{afterScore}</p></article>
      </div>
    </section>
  );
}
