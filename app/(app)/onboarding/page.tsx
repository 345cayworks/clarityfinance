"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Debt, FinancialProfile } from "@/types";

const defaultProfile: FinancialProfile = {
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savings: 0,
  creditScoreRange: "670-739",
  housingStatus: "renting"
};

export default function OnboardingPage() {
  const { supabase } = useAuth();
  const [profile, setProfile] = useState<FinancialProfile>(defaultProfile);
  const [debts, setDebts] = useState<Debt[]>([{ name: "", balance: 0, interestRate: 0, monthlyPayment: 0 }]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadExisting() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("Please login first.");
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

      if (debtRows?.length) {
        setDebts(
          debtRows.map((row) => ({
            id: row.id,
            name: row.name,
            balance: Number(row.balance),
            interestRate: Number(row.interest_rate),
            monthlyPayment: Number(row.monthly_payment)
          }))
        );
      }
    }

    loadExisting();
  }, [supabase]);

  const saveData = async () => {
    setStatus("Saving...");
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("Please login first.");
      return;
    }

    await supabase.from("users").upsert({ id: user.id });

    const { error: profileError } = await supabase.from("financial_profiles").upsert(
      {
        user_id: user.id,
        monthly_income: profile.monthlyIncome,
        monthly_expenses: profile.monthlyExpenses,
        savings: profile.savings,
        credit_score_range: profile.creditScoreRange,
        housing_status: profile.housingStatus
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      setStatus(profileError.message);
      return;
    }

    await supabase.from("debts").delete().eq("user_id", user.id);

    const cleanDebts = debts
      .filter((d) => d.name.trim().length > 0)
      .map((d) => ({
        user_id: user.id,
        name: d.name,
        balance: d.balance,
        interest_rate: d.interestRate,
        monthly_payment: d.monthlyPayment
      }));

    if (cleanDebts.length > 0) {
      const { error: debtError } = await supabase.from("debts").insert(cleanDebts);
      if (debtError) {
        setStatus(debtError.message);
        return;
      }
    }

    setStatus("Saved successfully.");
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Onboarding</h1>
        <p className="text-slate-600">Tell us where you are so we can build a personalized clarity plan.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div><label className="label">Monthly Income</label><input className="input" type="number" value={profile.monthlyIncome} onChange={(e)=>setProfile({ ...profile, monthlyIncome: Number(e.target.value) })} /></div>
        <div><label className="label">Monthly Expenses</label><input className="input" type="number" value={profile.monthlyExpenses} onChange={(e)=>setProfile({ ...profile, monthlyExpenses: Number(e.target.value) })} /></div>
        <div><label className="label">Savings</label><input className="input" type="number" value={profile.savings} onChange={(e)=>setProfile({ ...profile, savings: Number(e.target.value) })} /></div>
        <div>
          <label className="label">Credit Score Range</label>
          <select className="input" value={profile.creditScoreRange} onChange={(e)=>setProfile({ ...profile, creditScoreRange: e.target.value as FinancialProfile["creditScoreRange"] })}>
            <option>300-579</option><option>580-669</option><option>670-739</option><option>740-799</option><option>800-850</option>
          </select>
        </div>
        <div>
          <label className="label">Housing Status</label>
          <select className="input" value={profile.housingStatus} onChange={(e)=>setProfile({ ...profile, housingStatus: e.target.value as FinancialProfile["housingStatus"] })}>
            <option value="renting">Renting</option><option value="owning">Owning</option><option value="with_family">With Family</option>
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Debts</h2>
        {debts.map((debt, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-4">
            <input className="input" placeholder="Debt name" value={debt.name} onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, name: e.target.value } : d))} />
            <input className="input" type="number" placeholder="Balance" value={debt.balance} onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, balance: Number(e.target.value) } : d))} />
            <input className="input" type="number" placeholder="Interest %" value={debt.interestRate} onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, interestRate: Number(e.target.value) } : d))} />
            <input className="input" type="number" placeholder="Monthly payment" value={debt.monthlyPayment} onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, monthlyPayment: Number(e.target.value) } : d))} />
          </div>
        ))}
        <button className="btn-secondary" onClick={()=>setDebts([...debts, { name: "", balance: 0, interestRate: 0, monthlyPayment: 0 }])}>Add Debt</button>
      </div>

      <button className="btn-primary" onClick={saveData}>Save Profile</button>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </section>
  );
}
