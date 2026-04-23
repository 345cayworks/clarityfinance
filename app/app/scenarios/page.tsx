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

  const updated = applyScenario(data, { incomeIncrease, expenseReduction, debtPayoffAmount, lowerMortgageRateBy, addRoomRentalIncome });

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 md:grid-cols-3">
        <div><label className="label">Increase income</label><input className="input" type="number" value={incomeIncrease} onChange={(e) => setIncomeIncrease(Number(e.target.value))} /></div>
        <div><label className="label">Reduce expenses</label><input className="input" type="number" value={expenseReduction} onChange={(e) => setExpenseReduction(Number(e.target.value))} /></div>
        <div><label className="label">Pay off debt amount</label><input className="input" type="number" value={debtPayoffAmount} onChange={(e) => setDebtPayoffAmount(Number(e.target.value))} /></div>
        <div><label className="label">Lower mortgage rate by</label><input className="input" type="number" value={lowerMortgageRateBy} onChange={(e) => setLowerMortgageRateBy(Number(e.target.value))} /></div>
        <div><label className="label">Add room rental income</label><input className="input" type="number" value={addRoomRentalIncome} onChange={(e) => setAddRoomRentalIncome(Number(e.target.value))} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">Before</h3>
          <p>Cash flow: ${monthlyCashFlow(data).toFixed(0)}</p>
          <p>Clarity score: {clarityScore(data)}</p>
          <p>Home readiness: {homeReadinessScore(data)}</p>
        </div>
        <div className="card">
          <h3 className="font-semibold">After</h3>
          <p>Cash flow: ${monthlyCashFlow(updated).toFixed(0)}</p>
          <p>Clarity score: {clarityScore(updated)}</p>
          <p>Home readiness: {homeReadinessScore(updated)}</p>
        </div>
      </div>
    </div>
  );
}
