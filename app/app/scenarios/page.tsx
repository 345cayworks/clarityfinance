"use client";

import { useState } from "react";
import { applyScenario, clarityScore, homeReadinessScore, monthlyCashFlow } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function ScenariosPage() {
  const { data } = useFinanceData();
  const [incomeIncrease, setIncomeIncrease] = useState(300);
  const [expenseReduction, setExpenseReduction] = useState(150);
  const [debtPayoffAmount, setDebtPayoffAmount] = useState(1200);
  const [lowerMortgageRateBy, setLowerMortgageRateBy] = useState(0.5);
  const [addRoomRentalIncome, setAddRoomRentalIncome] = useState(250);
  const [savingsRateBoost, setSavingsRateBoost] = useState(5);
  const [lowerHousingCost, setLowerHousingCost] = useState(100);

  const updated = applyScenario(data, {
    incomeIncrease,
    expenseReduction,
    debtPayoffAmount,
    lowerMortgageRateBy,
    addRoomRentalIncome,
    savingsRateBoost,
    lowerHousingCost
  });

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 md:grid-cols-3">
        <div><label className="label">Increase monthly income</label><input className="input" type="number" value={incomeIncrease} onChange={(e) => setIncomeIncrease(Number(e.target.value))} /></div>
        <div><label className="label">Reduce monthly expenses</label><input className="input" type="number" value={expenseReduction} onChange={(e) => setExpenseReduction(Number(e.target.value))} /></div>
        <div><label className="label">Pay off one debt amount</label><input className="input" type="number" value={debtPayoffAmount} onChange={(e) => setDebtPayoffAmount(Number(e.target.value))} /></div>
        <div><label className="label">Adjust mortgage rate by</label><input className="input" type="number" value={lowerMortgageRateBy} onChange={(e) => setLowerMortgageRateBy(Number(e.target.value))} /></div>
        <div><label className="label">Add rental income</label><input className="input" type="number" value={addRoomRentalIncome} onChange={(e) => setAddRoomRentalIncome(Number(e.target.value))} /></div>
        <div><label className="label">Improve savings rate (%)</label><input className="input" type="number" value={savingsRateBoost} onChange={(e) => setSavingsRateBoost(Number(e.target.value))} /></div>
        <div><label className="label">Lower housing cost</label><input className="input" type="number" value={lowerHousingCost} onChange={(e) => setLowerHousingCost(Number(e.target.value))} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">Before</h3>
          <p>Cash flow: {data.preferredCurrency} {monthlyCashFlow(data).toFixed(0)}</p>
          <p>Clarity score: {clarityScore(data)}</p>
          <p>Home readiness: {homeReadinessScore(data)}</p>
        </div>
        <div className="card">
          <h3 className="font-semibold">After</h3>
          <p>Cash flow: {data.preferredCurrency} {monthlyCashFlow(updated).toFixed(0)}</p>
          <p>Clarity score: {clarityScore(updated)}</p>
          <p>Home readiness: {homeReadinessScore(updated)}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500">Assumptions used: scenario model is directional. It applies one-month changes to compare outcomes and does not replace lender or advisor underwriting.</p>
    </div>
  );
}
