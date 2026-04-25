import { auth } from "@/auth";
import { getUserFinanceSummary } from "@/lib/data/dashboard";
import { IncomeExpenseChart, DebtBreakdownChart } from "@/components/charts";

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-[#0A2540]">{value}</p></div>;
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getUserFinanceSummary(session!.user.id);
  const m = data.metrics;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Clarity Score" value={`${m.clarity}`} />
        <Metric label="Financial Stability Score" value={`${m.stability}`} />
        <Metric label="Monthly Cash Flow" value={`$${m.cashFlow.toFixed(0)}`} />
        <Metric label="Debt Pressure Index" value={`${m.debtPressure}%`} />
        <Metric label="Home Readiness Score" value={`${m.homeReadiness}`} />
        <Metric label="Savings Runway" value={`${m.runway.toFixed(1)} months`} />
        <Metric label="Top Insight" value={m.topInsight} />
        <Metric label="Recommended Next Step" value={m.nextStep} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <IncomeExpenseChart income={m.totalIncome} expenses={m.totalExpenses} />
        <DebtBreakdownChart totalDebt={m.totalDebt} monthlyPayment={data.debts.reduce((sum, d) => sum + d.monthlyPayment, 0)} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card"><h3 className="font-semibold">Goal Progress</h3><p className="text-sm text-slate-600 mt-2">Target cash flow goal: ${data.goal?.targetMonthlyCashFlow ?? 0}</p></div>
        <div className="card"><h3 className="font-semibold">Action Plan</h3><p className="text-sm text-slate-600 mt-2">{data.actionPlan ? data.actionPlan.name : "No action plan yet. Generate one in Action Plan."}</p></div>
        <div className="card"><h3 className="font-semibold">Profile Completion</h3><p className="text-sm text-slate-600 mt-2">{m.completion}% complete</p></div>
      </div>
    </div>
  );
}
