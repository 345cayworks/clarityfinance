"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { applyScenario, clarityScore } from "@/lib/calculations";
import { Debt, FinancialProfile, ScenarioInput } from "@/types";

const emptyProfile: FinancialProfile = {
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savings: 0,
  creditScoreRange: "670-739",
  housingStatus: "renting"
};

export default function ScenarioPage() {
  const { supabase } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [profile, setProfile] = useState<FinancialProfile>(emptyProfile);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [scenario, setScenario] = useState<ScenarioInput>({
    incomeDelta: 500,
    debtReduction: 2000,
    rentalIncome: 700,
    interestRateReduction: 1.5
  });

  useEffect(() => {
    async function loadData() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }
      setUserId(user.id);

      const [{ data: profileRow }, { data: debtRows }, { data: scenarioRow }] = await Promise.all([
        supabase
          .from("financial_profiles")
          .select("monthly_income,monthly_expenses,savings,credit_score_range,housing_status")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("debts").select("id,name,balance,interest_rate,monthly_payment").eq("user_id", user.id),
        supabase.from("scenarios").select("payload").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
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

      setDebts(
        (debtRows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          balance: Number(row.balance),
          interestRate: Number(row.interest_rate),
          monthlyPayment: Number(row.monthly_payment)
        }))
      );

      if (scenarioRow?.payload) {
        const payload = scenarioRow.payload as Partial<ScenarioInput>;
        setScenario((prev) => ({
          incomeDelta: Number(payload.incomeDelta ?? prev.incomeDelta),
          debtReduction: Number(payload.debtReduction ?? prev.debtReduction),
          rentalIncome: Number(payload.rentalIncome ?? prev.rentalIncome),
          interestRateReduction: Number(payload.interestRateReduction ?? prev.interestRateReduction)
        }));
      }
    }

    loadData();
  }, [supabase]);

  const beforeScore = useMemo(() => clarityScore(profile, debts), [profile, debts]);
  const projected = useMemo(() => applyScenario(profile, debts, scenario), [profile, debts, scenario]);
  const afterScore = useMemo(() => clarityScore(projected.profile, projected.debts), [projected]);

  const saveScenario = async () => {
    if (!userId) return;
    const { error } = await supabase.from("scenarios").insert({
      user_id: userId,
      name: "Latest scenario",
      payload: scenario
    });
    setStatus(error ? error.message : "Scenario saved.");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Scenario Engine</h1>
      <p className="text-slate-600">Simulate income growth, debt reduction, rental income, and rate improvements.</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Increased Income</label><input className="input" type="number" value={scenario.incomeDelta} onChange={(e)=>setScenario({ ...scenario, incomeDelta: Number(e.target.value) })} /></div>
        <div><label className="label">Reduced Debt (Total)</label><input className="input" type="number" value={scenario.debtReduction} onChange={(e)=>setScenario({ ...scenario, debtReduction: Number(e.target.value) })} /></div>
        <div><label className="label">Rental Income</label><input className="input" type="number" value={scenario.rentalIncome} onChange={(e)=>setScenario({ ...scenario, rentalIncome: Number(e.target.value) })} /></div>
        <div><label className="label">Lower Interest Rates (%)</label><input className="input" type="number" value={scenario.interestRateReduction} onChange={(e)=>setScenario({ ...scenario, interestRateReduction: Number(e.target.value) })} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="card"><h2 className="text-lg font-semibold">Current Clarity Score</h2><p className="mt-2 text-4xl font-bold text-brandBlue">{beforeScore}</p></article>
        <article className="card"><h2 className="text-lg font-semibold">Projected Clarity Score</h2><p className="mt-2 text-4xl font-bold text-brandTeal">{afterScore}</p></article>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={saveScenario}>Save Scenario</button>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </div>
    </section>
  );
}
