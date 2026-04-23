"use client";

import { useState } from "react";
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

  const saveData = async () => {
    setStatus("Saving...");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      setStatus("Please login first.");
      return;
    }

    await supabase.from("users").upsert({ id: userId });

    const { error: profileError } = await supabase.from("financial_profiles").upsert({ ...profile, user_id: userId });
    if (profileError) {
      setStatus(profileError.message);
      return;
    }

    await supabase.from("debts").delete().eq("user_id", userId);
    const debtRows = debts.map((d) => ({ ...d, user_id: userId }));
    const { error: debtError } = await supabase.from("debts").insert(debtRows);

    setStatus(debtError ? debtError.message : "Saved successfully.");
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Onboarding</h1>
        <p className="text-slate-600">Tell us where you are so we can build a personalized clarity plan.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div><label className="label">Monthly Income</label><input className="input" type="number" onChange={(e)=>setProfile({ ...profile, monthlyIncome: Number(e.target.value) })} /></div>
        <div><label className="label">Monthly Expenses</label><input className="input" type="number" onChange={(e)=>setProfile({ ...profile, monthlyExpenses: Number(e.target.value) })} /></div>
        <div><label className="label">Savings</label><input className="input" type="number" onChange={(e)=>setProfile({ ...profile, savings: Number(e.target.value) })} /></div>
        <div>
          <label className="label">Credit Score Range</label>
          <select className="input" onChange={(e)=>setProfile({ ...profile, creditScoreRange: e.target.value as FinancialProfile["creditScoreRange"] })}>
            <option>300-579</option><option>580-669</option><option>670-739</option><option>740-799</option><option>800-850</option>
          </select>
        </div>
        <div>
          <label className="label">Housing Status</label>
          <select className="input" onChange={(e)=>setProfile({ ...profile, housingStatus: e.target.value as FinancialProfile["housingStatus"] })}>
            <option value="renting">Renting</option><option value="owning">Owning</option><option value="with_family">With Family</option>
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Debts</h2>
        {debts.map((debt, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-4">
            <input className="input" placeholder="Debt name" onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, name: e.target.value } : d))} />
            <input className="input" type="number" placeholder="Balance" onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, balance: Number(e.target.value) } : d))} />
            <input className="input" type="number" placeholder="Interest %" onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, interestRate: Number(e.target.value) } : d))} />
            <input className="input" type="number" placeholder="Monthly payment" onChange={(e)=>setDebts(debts.map((d, idx)=>idx===i ? { ...d, monthlyPayment: Number(e.target.value) } : d))} />
          </div>
        ))}
        <button className="btn-secondary" onClick={()=>setDebts([...debts, { name: "", balance: 0, interestRate: 0, monthlyPayment: 0 }])}>Add Debt</button>
      </div>

      <button className="btn-primary" onClick={saveData}>Save Profile</button>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </section>
  );
}
