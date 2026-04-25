"use client";

import { useEffect, useState } from "react";
import { IncomeExpenseChart, DebtBreakdownChart } from "@/components/charts";
import { getIdentityToken, initIdentity } from "@/lib/auth/netlify-identity";
import { clarityScore, debtPayoffEstimates, debtToIncomeRatio, financialStabilityScore, homeReadinessScore, monthlyCashFlow, savingsRunway, totalExpenses, totalIncome } from "@/lib/calculations/finance";

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-[#0A2540]">{value}</p></div>;
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      await initIdentity();
      const token = await getIdentityToken();
      if (!token) {
        setData(null);
        return;
      }

      fetch("/.netlify/functions/profile-get", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then(setData)
        .catch(() => setData(null));
    };

    load();
  }, []);

  const incomes = data?.incomeSources ?? [];
  const expense = data?.expenseProfile ?? null;
  const debts = data?.debts ?? [];
  const profile = data?.profile ?? null;
  const savings = data?.savingsProfile ?? null;
  const goal = data?.goals ?? null;

  const income = totalIncome(incomes.map((i: any) => ({ monthlyAmount: Number(i.monthly_amount ?? 0) })));
  const expenses = totalExpenses(expense ? {
    housing: Number(expense.housing ?? 0), utilities: Number(expense.utilities ?? 0), transport: Number(expense.transport ?? 0), groceries: Number(expense.groceries ?? 0), insurance: Number(expense.insurance ?? 0), childcare: Number(expense.childcare ?? 0), discretionary: Number(expense.discretionary ?? 0), other: Number(expense.other ?? 0)
  } : null);
  const debtPayments = debts.reduce((sum: number, d: any) => sum + Number(d.monthly_payment ?? 0), 0);
  const cashFlow = monthlyCashFlow(income, expenses, debtPayments);
  const dti = debtToIncomeRatio(debtPayments, income);
  const totalSavings = Number(savings?.cash_savings ?? 0) + Number(savings?.emergency_fund ?? 0) + Number(savings?.investments ?? 0) + Number(savings?.retirement_savings ?? 0);
  const runway = savingsRunway(totalSavings, Math.max(0, expenses + debtPayments - income));
  const stability = financialStabilityScore(cashFlow, dti, runway);
  const homeReadiness = homeReadinessScore({
    downPaymentSavings: Number(savings?.down_payment_savings ?? 0),
    targetHomePrice: Number(goal?.target_home_price ?? 0),
    dti,
    creditScore: Number(profile?.credit_score_or_profile ?? 0) || null,
    isUnitedStates: String(profile?.country_or_market ?? "") === "United States"
  });
  const completionFields = [profile, incomes.length > 0, expense, debts.length > 0, data?.housingProfile, savings, goal];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
  const clarity = clarityScore(stability, homeReadiness, completion);
  const debtPlan = debtPayoffEstimates(debts.map((d: any) => ({ balance: Number(d.balance ?? 0), monthlyPayment: Number(d.monthly_payment ?? 0), interestRate: Number(d.interest_rate ?? 0) })));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Clarity Score" value={`${clarity || 0}`} />
        <Metric label="Financial Stability Score" value={`${stability || 0}`} />
        <Metric label="Monthly Cash Flow" value={`$${cashFlow.toFixed(0)}`} />
        <Metric label="Debt Pressure Index" value={`${Math.round(dti * 100)}%`} />
        <Metric label="Home Readiness Score" value={`${homeReadiness || 0}`} />
        <Metric label="Savings Runway" value={`${runway.toFixed(1)} months`} />
        <Metric label="Top Insight" value={cashFlow < 0 ? "Your cash flow is negative. Prioritize expense and debt optimization." : "Your positive cash flow can be allocated to goals faster."} />
        <Metric label="Recommended Next Step" value={completion < 100 ? "Complete onboarding profile to improve plan accuracy." : "Run a scenario and lock your next 30-day action plan."} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <IncomeExpenseChart income={income} expenses={expenses} />
        <DebtBreakdownChart totalDebt={debtPlan.totalDebt} monthlyPayment={debtPayments} />
      </div>
    </div>
  );
}
