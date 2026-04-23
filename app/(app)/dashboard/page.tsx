import Link from "next/link";
import { CashFlowChart } from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import { clarityScore, debtPressureIndex, homeReadinessScore, monthlyCashFlow } from "@/lib/calculations";
import { getUserFinanceData, requireUser } from "@/lib/financeData";

export default async function DashboardPage() {
  const { user } = await requireUser();
  const { profile, debts } = await getUserFinanceData(user.id);

  if (!profile) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Complete onboarding to unlock your Clarity Score and personalized insights.</p>
        <Link href="/onboarding" className="btn-primary inline-flex">Go to Onboarding</Link>
      </section>
    );
  }

  const clarity = clarityScore(profile, debts);
  const cash = monthlyCashFlow(profile, debts);
  const pressure = debtPressureIndex(profile, debts);
  const readiness = homeReadinessScore(profile, debts);

  const data = [
    { month: "Jan", cashFlow: cash * 0.9 },
    { month: "Feb", cashFlow: cash * 0.92 },
    { month: "Mar", cashFlow: cash * 0.97 },
    { month: "Apr", cashFlow: cash },
    { month: "May", cashFlow: cash * 1.04 },
    { month: "Jun", cashFlow: cash * 1.08 }
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Know where you stand. Know what’s next.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clarity Score" value={`${clarity}/100`} />
        <MetricCard title="Monthly Cash Flow" value={`$${cash.toLocaleString()}`} tone="teal" />
        <MetricCard title="Debt Pressure Index" value={`${pressure}/100`} />
        <MetricCard title="Home Readiness Score" value={`${readiness}/100`} tone="teal" />
      </div>

      <CashFlowChart data={data} />
    </section>
  );
}
