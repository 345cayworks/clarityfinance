"use client";

import { useState } from "react";
import { refinanceComparison } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function RefinancePage() {
  const { data } = useFinanceData();
  const [newRate, setNewRate] = useState(5.5);
  const [yearsLeft, setYearsLeft] = useState(27);
  const [closingCosts, setClosingCosts] = useState(3500);
  const result = refinanceComparison(data.mortgageBalance, data.mortgageRate, newRate, yearsLeft, closingCosts);

  return (
    <div className="space-y-4">
      <div className="card grid gap-4 md:grid-cols-3">
        <div><label className="label">New interest rate %</label><input className="input" type="number" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} /></div>
        <div><label className="label">Years left</label><input className="input" type="number" value={yearsLeft} onChange={(e) => setYearsLeft(Number(e.target.value))} /></div>
        <div><label className="label">Closing costs</label><input className="input" type="number" value={closingCosts} onChange={(e) => setClosingCosts(Number(e.target.value))} /></div>
      </div>
      <div className="card">
        <p>Current est. payment: <strong>${result.currentPayment.toFixed(0)}</strong></p>
        <p>New est. payment: <strong>${result.newPayment.toFixed(0)}</strong></p>
        <p>Monthly savings: <strong>${result.monthlySavings.toFixed(0)}</strong></p>
        <p>Break-even: <strong>{result.breakEvenMonths ? `${result.breakEvenMonths} months` : "No break-even"}</strong></p>
      </div>
      <p className="text-sm text-slate-500">Assumptions used: fixed-rate amortization estimate only; excludes taxes/insurance and escrow changes.</p>
    </div>
  );
}
