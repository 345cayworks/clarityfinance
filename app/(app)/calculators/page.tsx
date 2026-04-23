"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { debtPayoffMonths, mortgageAffordability, refinanceComparison } from "@/lib/calculations";
import { Debt, FinancialProfile } from "@/types";

const emptyProfile: FinancialProfile = {
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savings: 0,
  creditScoreRange: "670-739",
  housingStatus: "renting"
};

export default function CalculatorsPage() {
  const { supabase } = useAuth();
  const [profile, setProfile] = useState<FinancialProfile>(emptyProfile);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assumptions, setAssumptions] = useState("Using your saved profile and debts from onboarding.");
  const [currentRate, setCurrentRate] = useState(7.1);
  const [newRate, setNewRate] = useState(5.9);
  const [balance, setBalance] = useState(290000);
  const [yearsLeft, setYearsLeft] = useState(27);
  const [rentalIncome, setRentalIncome] = useState(900);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setAssumptions("Sign in required.");
        return;
      }

      const [{ data: profileRow }, { data: debtRows }] = await Promise.all([
        supabase
          .from("financial_profiles")
          .select("monthly_income,monthly_expenses,savings,credit_score_range,housing_status")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("debts").select("id,name,balance,interest_rate,monthly_payment").eq("user_id", user.id)
      ]);

      if (profileRow) {
        setProfile({
          monthlyIncome: Number(profileRow.monthly_income),
          monthlyExpenses: Number(profileRow.monthly_expenses),
          savings: Number(profileRow.savings),
          creditScoreRange: profileRow.credit_score_range as FinancialProfile["creditScoreRange"],
          housingStatus: profileRow.housing_status as FinancialProfile["housingStatus"]
        });
      }

      const mappedDebts: Debt[] = (debtRows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        balance: Number(row.balance),
        interestRate: Number(row.interest_rate),
        monthlyPayment: Number(row.monthly_payment)
      }));

      setDebts(mappedDebts);

      if (!profileRow) {
        setAssumptions("Add onboarding data for personalized affordability and debt projections.");
      }
    }

    loadData();
  }, [supabase]);

  const mortgage = useMemo(() => mortgageAffordability(profile, debts), [profile, debts]);
  const refi = refinanceComparison(balance, currentRate, newRate, yearsLeft);
  const payoffMonths = debtPayoffMonths(debts);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Calculators</h1>
      <p className="text-sm text-slate-600">Assumptions: {assumptions}</p>
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
