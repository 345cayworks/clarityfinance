import { generateActionPlan } from "@/lib/calculations";
import { getUserFinanceData, requireUser } from "@/lib/financeData";
import { createClient } from "@/lib/supabase/server";

export default async function ActionPlanPage() {
  const { user } = await requireUser();
  const { profile, debts } = await getUserFinanceData(user.id);
  const supabase = createClient();

  const { data: storedPlans } = await supabase
    .from("plans")
    .select("window,title,detail")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const fallbackPlan = profile ? generateActionPlan(profile, debts) : { "30-day": [], "90-day": [], "12-month": [] };

  const groupedPlans = storedPlans?.length
    ? storedPlans.reduce<Record<string, { title: string; detail: string }[]>>((acc, row) => {
        const key = row.window;
        acc[key] = acc[key] ?? [];
        acc[key].push({ title: row.title, detail: row.detail });
        return acc;
      }, {})
    : fallbackPlan;

  if (!profile && !storedPlans?.length) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Action Plan</h1>
        <p className="text-slate-600">Complete onboarding to generate your 30-day, 90-day, and 12-month roadmap.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Action Plan</h1>
      <p className="text-slate-600">Step-by-step roadmap based on your current financial profile.</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(groupedPlans).map(([window, steps]) => (
          <article key={window} className="card">
            <h2 className="mb-3 text-xl font-semibold text-brandBlue">{window}</h2>
            <ul className="space-y-3">
              {steps.map((step) => (
                <li key={step.title}>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.detail}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
