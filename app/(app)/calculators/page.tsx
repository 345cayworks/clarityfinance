"use client";

import { useMemo, useState } from "react";
import { debtPayoffMonths, mortgageAffordability, refinanceComparison } from "@/lib/calculations";
import { Debt, FinancialProfile } from "@/types";

const profile: FinancialProfile = {
  monthlyIncome: 8000,
  monthlyExpenses: 3500,
  savings: 22000,
  creditScoreRange: "740-799",
  housingStatus: "renting"
};

const debts: Debt[] = [
  { name: "Card A", balance: 5000, interestRate: 18, monthlyPayment: 220 },
  { name: "Card B", balance: 3200, interestRate: 16, monthlyPayment: 160 }
];

export default function CalculatorsPage() {
  const mortgage = useMemo(() => mortgageAffordability(profile, debts), []);
  const [currentRate, setCurrentRate] = useState(7.1);
  const [newRate, setNewRate] = useState(5.9);
  const [balance, setBalance] = useState(290000);
  const [yearsLeft, setYearsLeft] = useState(27);
  const [rentalIncome, setRentalIncome] = useState(900);

  const refi = refinanceComparison(balance, currentRate, newRate, yearsLeft);
  const payoffMonths = debtPayoffMonths(debts);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Calculators</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card space-y-2">
          <h2 className="text-xl font-semibold">Mortgage Affordability</h2>
          <p>Max monthly housing budget: <span className="font-semibold">${mortgage.maxMonthlyHousing.toFixed(0)}</span></p>
          <p>Estimated affordable home price: <span className="font-semibold">${mortgage.estimatedHomePrice.toFixed(0)}</span></p>
        </article>

        <article className="card space-y-3">
          <h2 className="text-xl font-semibold">Refinance Comparison</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="input" type="number" value={balance} onChange={(e)=>setBalance(Number(e.target.value))} placeholder="Balance" />
            <input className="input" type="number" value={yearsLeft} onChange={(e)=>setYearsLeft(Number(e.target.value))} placeholder="Years left" />
            <input className="input" type="number" value={currentRate} onChange={(e)=>setCurrentRate(Number(e.target.value))} placeholder="Current rate" />
            <input className="input" type="number" value={newRate} onChange={(e)=>setNewRate(Number(e.target.value))} placeholder="New rate" />
          </div>
          <p>Current payment: <strong>${refi.currentPayment.toFixed(0)}</strong></p>
          <p>New payment: <strong>${refi.newPayment.toFixed(0)}</strong></p>
          <p>Monthly savings: <strong className="text-brandTeal">${refi.monthlySavings.toFixed(0)}</strong></p>
        </article>

        <article className="card space-y-2">
          <h2 className="text-xl font-semibold">Rent-a-Room Impact</h2>
          <input className="input" type="number" value={rentalIncome} onChange={(e)=>setRentalIncome(Number(e.target.value))} placeholder="Estimated rental income" />
          <p>Potential annual offset: <strong>${(rentalIncome * 12).toLocaleString()}</strong></p>
          <p>Potential principal contribution (50%): <strong>${(rentalIncome * 6).toLocaleString()}</strong></p>
        </article>

        <article className="card space-y-2">
          <h2 className="text-xl font-semibold">Debt Planner</h2>
          <p>Estimated payoff timeline: <strong>{payoffMonths || "N/A"} months</strong></p>
          <p className="text-sm text-slate-600">Increase monthly debt payments to shorten this timeline significantly.</p>
        </article>
      </div>
    </section>
  );
}
