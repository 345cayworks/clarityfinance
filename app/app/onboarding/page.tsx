"use client";

import { useFinanceData } from "@/hooks/useFinanceData";
import { CreditScoreRange, DebtItem, HousingStatus } from "@/types";

const creditOptions: CreditScoreRange[] = ["300-579", "580-669", "670-739", "740-799", "800-850"];
const housingOptions: HousingStatus[] = ["renting", "homeowner", "living_with_family", "other"];

export default function OnboardingPage() {
  const { data, hydrated, update, fillSample, reset } = useFinanceData();
  if (!hydrated) return <div className="card">Loading profile...</div>;

  const updateDebt = (id: string, key: keyof DebtItem, value: string) => {
    update(
      "debts",
      data.debts.map((debt) => (debt.id === id ? { ...debt, [key]: key === "name" ? value : Number(value) } : debt))
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={fillSample}>Sample data</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={reset}>Clear my data</button>
      </div>

      <section className="card grid gap-4 md:grid-cols-2">
        <div><label className="label">Monthly income</label><input className="input" type="number" value={data.monthlyIncome} onChange={(e) => update("monthlyIncome", Number(e.target.value))} /></div>
        <div><label className="label">Other income</label><input className="input" type="number" value={data.otherIncome} onChange={(e) => update("otherIncome", Number(e.target.value))} /></div>
        <div><label className="label">Monthly expenses</label><input className="input" type="number" value={data.monthlyExpenses} onChange={(e) => update("monthlyExpenses", Number(e.target.value))} /></div>
        <div><label className="label">Savings</label><input className="input" type="number" value={data.savings} onChange={(e) => update("savings", Number(e.target.value))} /></div>
      </section>

      <section className="card grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Credit score range</label>
          <select className="input" value={data.creditScoreRange} onChange={(e) => update("creditScoreRange", e.target.value as CreditScoreRange)}>
            {creditOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Housing status</label>
          <select className="input" value={data.housingStatus} onChange={(e) => update("housingStatus", e.target.value as HousingStatus)}>
            {housingOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>

        {data.housingStatus === "homeowner" ? (
          <>
            <div><label className="label">Mortgage balance</label><input className="input" type="number" value={data.mortgageBalance} onChange={(e) => update("mortgageBalance", Number(e.target.value))} /></div>
            <div><label className="label">Mortgage rate (%)</label><input className="input" type="number" step="0.01" value={data.mortgageRate} onChange={(e) => update("mortgageRate", Number(e.target.value))} /></div>
            <div><label className="label">Mortgage payment</label><input className="input" type="number" value={data.mortgagePayment} onChange={(e) => update("mortgagePayment", Number(e.target.value))} /></div>
          </>
        ) : null}

        {data.housingStatus === "renting" ? (
          <div><label className="label">Rent amount</label><input className="input" type="number" value={data.rentAmount} onChange={(e) => update("rentAmount", Number(e.target.value))} /></div>
        ) : null}

        <div><label className="label">Estimated room rental income</label><input className="input" type="number" value={data.estimatedRoomRentalIncome} onChange={(e) => update("estimatedRoomRentalIncome", Number(e.target.value))} /></div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Debts</h2><button className="btn-primary" onClick={() => update("debts", [...data.debts, { id: crypto.randomUUID(), name: "", balance: 0, interestRate: 0, monthlyPayment: 0 }])}>Add debt</button></div>
        {data.debts.length === 0 ? <p className="text-sm text-slate-500">No debts yet. Add one to power calculators.</p> : null}
        {data.debts.map((debt) => (
          <div key={debt.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-5">
            <input className="input" placeholder="Name" value={debt.name} onChange={(e) => updateDebt(debt.id, "name", e.target.value)} />
            <input className="input" placeholder="Balance" type="number" value={debt.balance} onChange={(e) => updateDebt(debt.id, "balance", e.target.value)} />
            <input className="input" placeholder="Interest %" type="number" value={debt.interestRate} onChange={(e) => updateDebt(debt.id, "interestRate", e.target.value)} />
            <input className="input" placeholder="Monthly payment" type="number" value={debt.monthlyPayment} onChange={(e) => updateDebt(debt.id, "monthlyPayment", e.target.value)} />
            <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm text-rose-700" onClick={() => update("debts", data.debts.filter((d) => d.id !== debt.id))}>Remove</button>
          </div>
        ))}
      </section>
    </div>
  );
}
