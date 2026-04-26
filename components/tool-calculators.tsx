"use client";

import { useMemo, useState } from "react";
import { debtPayoffEstimates, mortgageAffordability, rentRoomImpact } from "@/lib/calculations/finance";

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
  const [homeValue, setHomeValue] = useState(500000);
  const [currentBalance, setCurrentBalance] = useState(300000);
  const [currentMonthlyPayment, setCurrentMonthlyPayment] = useState(2200);
  const [currentRate, setCurrentRate] = useState(6.75);
  const [newLoanAmount, setNewLoanAmount] = useState(350000);
  const [newRate, setNewRate] = useState(6.15);
  const [termYears, setTermYears] = useState(30);
  const [closingCosts, setClosingCosts] = useState(7000);

  const calc = useMemo(() => {
    const availableEquity = homeValue - currentBalance;
    const cashOutAmount = newLoanAmount - currentBalance;
    const ltv = homeValue > 0 ? newLoanAmount / homeValue : 0;
    const monthlyRate = newRate / 100 / 12;
    const months = termYears * 12;
    const newMonthlyPayment =
      monthlyRate > 0
        ? (newLoanAmount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1)
        : months > 0
          ? newLoanAmount / months
          : 0;
    const paymentDifference = newMonthlyPayment - currentMonthlyPayment;
    const netCashAfterClosingCosts = cashOutAmount - closingCosts;
    return { availableEquity, cashOutAmount, ltv, newMonthlyPayment, paymentDifference, netCashAfterClosingCosts };
  }, [homeValue, currentBalance, currentMonthlyPayment, newLoanAmount, newRate, termYears, closingCosts]);

  return <ToolCard title="Cash-Out Refinance Tool" result={`New payment: $${calc.newMonthlyPayment.toFixed(0)} · Net cash: $${calc.netCashAfterClosingCosts.toFixed(0)}`}>
    <Field label="Current home value" value={homeValue} setValue={setHomeValue} />
    <Field label="Current mortgage balance" value={currentBalance} setValue={setCurrentBalance} />
    <Field label="Current monthly mortgage payment" value={currentMonthlyPayment} setValue={setCurrentMonthlyPayment} />
    <Field label="Current interest rate (%)" value={currentRate} setValue={setCurrentRate} />
    <Field label="New loan amount / proposed mortgage balance" value={newLoanAmount} setValue={setNewLoanAmount} />
    <Field label="Cash out amount (derived)" value={calc.cashOutAmount} setValue={() => undefined} />
    <Field label="New interest rate (%)" value={newRate} setValue={setNewRate} />
    <Field label="New loan term (years)" value={termYears} setValue={setTermYears} />
    <Field label="Closing costs estimate" value={closingCosts} setValue={setClosingCosts} />
    <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
      <p>Available equity: ${calc.availableEquity.toFixed(0)}</p>
      <p>Cash out amount: ${calc.cashOutAmount.toFixed(0)}</p>
      <p>New mortgage balance: ${newLoanAmount.toFixed(0)}</p>
      <p>New estimated monthly payment: ${calc.newMonthlyPayment.toFixed(0)}</p>
      <p>Increase/decrease in payment: ${calc.paymentDifference.toFixed(0)}</p>
      <p>Loan-to-value: {(calc.ltv * 100).toFixed(1)}%</p>
      <p>Net cash after closing costs: ${calc.netCashAfterClosingCosts.toFixed(0)}</p>
    </div>
    {calc.ltv > 0.8 ? <p className="text-sm text-amber-700">High LTV: lender approval may be harder and costs may rise.</p> : null}
    {calc.paymentDifference > currentMonthlyPayment * 0.2 ? <p className="text-sm text-amber-700">Payment impact is significant.</p> : null}
    {calc.netCashAfterClosingCosts <= 0 ? <p className="text-sm text-amber-700">Cash-out amount may not justify costs.</p> : null}
    <p className="text-xs text-slate-500">
      Best uses: high-interest debt payoff, home improvement, investment/property strategy. Avoid using cash-out refinance for lifestyle spending unless repayment plan is clear.
    </p>
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
