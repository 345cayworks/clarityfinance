"use client";

import { useMemo, useState } from "react";
import { debtPayoffEstimates, mortgageAffordability, refinanceComparison, rentRoomImpact } from "@/lib/calculations/finance";

export function MortgageTool() {
  const [income, setIncome] = useState(8000);
  const [debts, setDebts] = useState(500);
  const [rate, setRate] = useState(6.5);
  const calc = useMemo(() => mortgageAffordability({ monthlyIncome: income, monthlyDebts: debts, rate, years: 30 }), [income, debts, rate]);
  return <ToolCard title="Mortgage Tool" result={`Affordable payment: $${calc.affordablePayment}/mo · Home price: $${calc.affordableHomePrice}`}> 
    <Field label="Monthly income" value={income} setValue={setIncome} />
    <Field label="Monthly debts" value={debts} setValue={setDebts} />
    <Field label="Rate" value={rate} setValue={setRate} />
    <p className="text-xs text-slate-500">Assumptions: {calc.assumptions.join(" · ")}. Optional for non-U.S. users without credit score.</p>
  </ToolCard>;
}

export function RefinanceTool() {
  const [balance, setBalance] = useState(300000);
  const [currentRate, setCurrentRate] = useState(7);
  const [newRate, setNewRate] = useState(5.75);
  const [costs, setCosts] = useState(4000);
  const calc = useMemo(() => refinanceComparison({ currentBalance: balance, currentRate, newRate, yearsLeft: 25, closingCosts: costs }), [balance, currentRate, newRate, costs]);
  return <ToolCard title="Refinance Tool" result={`Monthly savings: $${calc.monthlySavings.toFixed(0)} · Break-even: ${calc.breakEvenMonths ? `${calc.breakEvenMonths.toFixed(1)} months` : "N/A"}`}>
    <Field label="Current balance" value={balance} setValue={setBalance} />
    <Field label="Current rate" value={currentRate} setValue={setCurrentRate} />
    <Field label="New rate" value={newRate} setValue={setNewRate} />
    <Field label="Closing costs" value={costs} setValue={setCosts} />
  </ToolCard>;
}

export function RentRoomTool() {
  const [cashFlow, setCashFlow] = useState(250);
  const [roomIncome, setRoomIncome] = useState(900);
  const calc = useMemo(() => rentRoomImpact(cashFlow, roomIncome), [cashFlow, roomIncome]);
  return <ToolCard title="Rent-a-Room Tool" result={`New cash flow: $${calc.newCashFlow.toFixed(0)} · Improvement: $${calc.improvement.toFixed(0)}`}> 
    <Field label="Current cash flow" value={cashFlow} setValue={setCashFlow} />
    <Field label="Room rental income" value={roomIncome} setValue={setRoomIncome} />
  </ToolCard>;
}

export function DebtPlanTool() {
  const calc = debtPayoffEstimates([
    { name: "Card A", type: "credit", balance: 3200, interestRate: 26, monthlyPayment: 200 },
    { name: "Loan", type: "personal", balance: 8500, interestRate: 12, monthlyPayment: 250 }
  ]);
  return <ToolCard title="Debt Plan Tool" result={`Total debt: $${calc.totalDebt.toFixed(0)} · Estimated payoff: ${calc.estimatedMonths} months`}>
    <p className="text-sm text-slate-600">{calc.snowballNote}</p>
    <p className="text-sm text-slate-600">{calc.avalancheNote}</p>
  </ToolCard>;
}

function ToolCard({ title, result, children }: { title: string; result: string; children: React.ReactNode }) {
  return <div className="card"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-slate-600">{result}</p><div className="mt-4 space-y-2">{children}</div></div>;
}

function Field({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return <label className="block text-sm"><span className="mb-1 block text-slate-500">{label}</span><input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full rounded-lg border p-2" /></label>;
}
