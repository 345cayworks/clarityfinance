"use client";

import { useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { CountryOrMarket, CreditProfile, CurrencyCode, DebtItem, EmploymentType, HousingStatus, TargetGoal } from "@/types";

const creditOptions: CreditProfile[] = ["not_provided", "300-579", "580-669", "670-739", "740-799", "800-850"];
const housingOptions: HousingStatus[] = ["renting", "homeowner", "living_with_family", "other"];
const countryOptions: CountryOrMarket[] = ["United States", "Cayman Islands", "Jamaica", "Dominican Republic", "Other"];
const currencyOptions: CurrencyCode[] = ["USD", "KYD", "JMD", "DOP", "Other"];
const employmentOptions: EmploymentType[] = ["full_time", "part_time", "self_employed", "contract", "unemployed", "retired"];
const targetGoals: TargetGoal[] = ["buy_home", "refinance_home", "reduce_debt", "grow_savings", "improve_cash_flow"];

const titleCase = (value: string) => value.replaceAll("_", " ");

export function ProfileEditor({ title = "Profile" }: { title?: string }) {
  const { data, hydrated, update, fillSample, reset, hasLegacyData, importLegacyData } = useFinanceData();
  const [openSection, setOpenSection] = useState("identity");

  if (!hydrated) return <div className="card">Loading profile...</div>;
  const isUS = data.countryOrMarket === "United States";

  const updateDebt = (id: string, key: keyof DebtItem, value: string) => {
    update("debts", data.debts.map((debt) => (debt.id === id ? { ...debt, [key]: key === "name" || key === "type" ? value : Number(value) } : debt)));
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex flex-wrap gap-2">
          {hasLegacyData ? <button className="btn-secondary" onClick={importLegacyData}>Import local data into Neon</button> : null}
          <button className="btn-secondary" onClick={fillSample}>Sample data</button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => reset()}>Clear my data</button>
        </div>
      </div>

      {[
        ["identity", "Profile basics"],
        ["income", "Income"],
        ["expenses", "Expenses"],
        ["housing", "Housing"],
        ["debts", "Debts"]
      ].map(([id, label]) => (
        <button key={id} className={`rounded-lg border px-3 py-2 text-sm ${openSection === id ? "border-brandBlue bg-blue-50" : "border-slate-300"}`} onClick={() => setOpenSection(id)}>{label}</button>
      ))}

      {openSection === "identity" ? <section className="card grid gap-4 md:grid-cols-2">
        <div><label className="label">Country / Market *</label><select className="input" value={data.countryOrMarket} onChange={(e) => update("countryOrMarket", e.target.value as CountryOrMarket)}>{countryOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
        <div><label className="label">Preferred currency</label><select className="input" value={data.preferredCurrency} onChange={(e) => update("preferredCurrency", e.target.value as CurrencyCode)}>{currencyOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
        <div><label className="label">Age range</label><input className="input" value={data.ageRange} onChange={(e) => update("ageRange", e.target.value)} /></div>
        <div><label className="label">Employment type</label><select className="input" value={data.employmentType} onChange={(e) => update("employmentType", e.target.value as EmploymentType)}>{employmentOptions.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></div>
        <div><label className="label">Household status</label><input className="input" value={data.householdStatus} onChange={(e) => update("householdStatus", e.target.value)} /></div>
        <div><label className="label">Dependents</label><input className="input" type="number" min={0} value={data.dependents} onChange={(e) => update("dependents", Number(e.target.value))} /></div>
        <div><label className="label">Target goal</label><select className="input" value={data.targetGoal} onChange={(e) => update("targetGoal", e.target.value as TargetGoal)}>{targetGoals.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></div>
        <div><label className="label">Credit Score / Credit Profile {isUS ? "(recommended)" : "(optional)"}</label><select className="input" value={data.creditScoreRange} onChange={(e) => update("creditScoreRange", e.target.value as CreditProfile)}>{creditOptions.map((option) => <option key={option} value={option}>{option === "not_provided" ? "Not provided" : option}</option>)}</select>{!isUS ? <p className="helper">Optional for non-U.S. users. Lending criteria vary by country.</p> : null}</div>
      </section> : null}

      {openSection === "income" ? <section className="card grid gap-4 md:grid-cols-2">
        <div><label className="label">Monthly income</label><input className="input" type="number" value={data.monthlyIncome} onChange={(e) => update("monthlyIncome", Number(e.target.value))} /></div>
        <div><label className="label">Other income</label><input className="input" type="number" value={data.otherIncome} onChange={(e) => update("otherIncome", Number(e.target.value))} /></div>
        <div><label className="label">Income frequency</label><input className="input" value={data.incomeFrequency} onChange={(e) => update("incomeFrequency", e.target.value)} /></div>
        <div><label className="label">Income stability</label><input className="input" value={data.incomeStability} onChange={(e) => update("incomeStability", e.target.value)} /></div>
        <div><label className="label">Rental income</label><input className="input" type="number" value={data.rentalIncome} onChange={(e) => update("rentalIncome", Number(e.target.value))} /></div>
        <div><label className="label">Side income</label><input className="input" type="number" value={data.sideIncome} onChange={(e) => update("sideIncome", Number(e.target.value))} /></div>
      </section> : null}

      {openSection === "expenses" ? <section className="card grid gap-4 md:grid-cols-2">
        <div><label className="label">Monthly expenses</label><input className="input" type="number" value={data.monthlyExpenses} onChange={(e) => update("monthlyExpenses", Number(e.target.value))} /></div>
        <div><label className="label">Monthly housing cost</label><input className="input" type="number" value={data.monthlyHousingCost} onChange={(e) => update("monthlyHousingCost", Number(e.target.value))} /></div>
        <div><label className="label">Utilities</label><input className="input" type="number" value={data.utilities} onChange={(e) => update("utilities", Number(e.target.value))} /></div>
        <div><label className="label">Transport</label><input className="input" type="number" value={data.transport} onChange={(e) => update("transport", Number(e.target.value))} /></div>
        <div><label className="label">Groceries</label><input className="input" type="number" value={data.groceries} onChange={(e) => update("groceries", Number(e.target.value))} /></div>
        <div><label className="label">Insurance</label><input className="input" type="number" value={data.insurance} onChange={(e) => update("insurance", Number(e.target.value))} /></div>
        <div><label className="label">Childcare</label><input className="input" type="number" value={data.childcare} onChange={(e) => update("childcare", Number(e.target.value))} /></div>
        <div><label className="label">Discretionary spending</label><input className="input" type="number" value={data.discretionarySpending} onChange={(e) => update("discretionarySpending", Number(e.target.value))} /></div>
      </section> : null}

      {openSection === "housing" ? <section className="card grid gap-4 md:grid-cols-2">
        <div><label className="label">Housing status</label><select className="input" value={data.housingStatus} onChange={(e) => update("housingStatus", e.target.value as HousingStatus)}>{housingOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
        <div><label className="label">Rent amount</label><input className="input" type="number" value={data.rentAmount} onChange={(e) => update("rentAmount", Number(e.target.value))} /></div>
        <div><label className="label">Mortgage balance</label><input className="input" type="number" value={data.mortgageBalance} onChange={(e) => update("mortgageBalance", Number(e.target.value))} /></div>
        <div><label className="label">Mortgage rate (%)</label><input className="input" type="number" step="0.01" value={data.mortgageRate} onChange={(e) => update("mortgageRate", Number(e.target.value))} /></div>
        <div><label className="label">Mortgage payment</label><input className="input" type="number" value={data.mortgagePayment} onChange={(e) => update("mortgagePayment", Number(e.target.value))} /></div>
        <div><label className="label">Estimated home value</label><input className="input" type="number" value={data.estimatedHomeValue} onChange={(e) => update("estimatedHomeValue", Number(e.target.value))} /></div>
        <div><label className="label">Spare room available</label><select className="input" value={String(data.spareRoomAvailable)} onChange={(e) => update("spareRoomAvailable", e.target.value === "true")}><option value="false">No</option><option value="true">Yes</option></select></div>
        <div><label className="label">Estimated room rental income</label><input className="input" type="number" value={data.estimatedRoomRentalIncome} onChange={(e) => update("estimatedRoomRentalIncome", Number(e.target.value))} /></div>
      </section> : null}

      {openSection === "debts" ? <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Debts</h2><button className="btn-primary" onClick={() => update("debts", [...data.debts, { id: crypto.randomUUID(), name: "", type: "other", balance: 0, interestRate: 0, monthlyPayment: 0 }])}>Add debt</button></div>
        {data.debts.map((debt) => (<div key={debt.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-6"><input className="input" placeholder="Name" value={debt.name} onChange={(e) => updateDebt(debt.id, "name", e.target.value)} /><input className="input" placeholder="Type" value={debt.type} onChange={(e) => updateDebt(debt.id, "type", e.target.value)} /><input className="input" placeholder="Balance" type="number" value={debt.balance} onChange={(e) => updateDebt(debt.id, "balance", e.target.value)} /><input className="input" placeholder="Interest %" type="number" value={debt.interestRate} onChange={(e) => updateDebt(debt.id, "interestRate", e.target.value)} /><input className="input" placeholder="Monthly payment" type="number" value={debt.monthlyPayment} onChange={(e) => updateDebt(debt.id, "monthlyPayment", e.target.value)} /><button className="rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm text-rose-700" onClick={() => update("debts", data.debts.filter((d) => d.id !== debt.id))}>Remove</button></div>))}
      </section> : null}
    </div>
  );
}
