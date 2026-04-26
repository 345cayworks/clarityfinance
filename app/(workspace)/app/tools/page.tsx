import Link from "next/link";
import type { Route } from "next";

const toolLinks = [
  { label: "Mortgage", href: "/app/tools/mortgage", description: "Model monthly payment, affordability, and long-term housing costs." },
  { label: "Cash-Out Refinance", href: "/app/tools/refinance", description: "Estimate proceeds, payment impact, and refinance tradeoffs." },
  { label: "Rent-a-Room", href: "/app/tools/rent-a-room", description: "Project setup costs, rent income, and break-even timeline." },
  { label: "Debt Plan", href: "/app/tools/debt-plan", description: "Compare payoff strategies and monthly debt reduction plans." }
] satisfies Array<{ label: string; href: Route; description: string }>;

export default function ToolsPage() {
  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Tools</h1>
        <p className="text-sm text-slate-600">Choose a planning tool to run focused calculations.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {toolLinks.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="card border border-slate-200 transition-colors hover:border-slate-300"
          >
            <h2 className="text-lg font-semibold text-[#0A2540]">{tool.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
