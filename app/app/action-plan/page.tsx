"use client";

import { generateActionPlan } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function ActionPlanPage() {
  const { data } = useFinanceData();
  const plan = generateActionPlan(data);

  const sections: Array<[string, string[]]> = [
    ["30-day priorities", plan.shortTerm],
    ["90-day priorities", plan.midTerm],
    ["12-month priorities", plan.longTerm]
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-sm text-slate-500">Tailored using market, housing status, debt load, savings, target goal, and rental-income potential.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map(([title, items]) => (
          <section className="card" key={title}>
            <h2 className="font-semibold">{title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
