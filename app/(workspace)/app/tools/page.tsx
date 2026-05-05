"use client";

import Link from "next/link";
import type { Route } from "next";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { canUsePremiumTools } from "@/lib/types/roles";

const toolLinks = [
  { label: "Mortgage", href: "/app/tools/mortgage", description: "Model monthly payment, affordability, and long-term housing costs." },
  { label: "Cash-Out Refinance", href: "/app/tools/refinance", description: "Estimate proceeds, payment impact, and refinance tradeoffs." },
  { label: "Rent-a-Room", href: "/app/tools/rent-a-room", description: "Project setup costs, rent income, and break-even timeline." },
  { label: "Retirement Readiness", href: "/app/tools/retirement", description: "Project retirement savings, income gaps, readiness score, and contribution targets." },
  { label: "Dividend Reinvestment Calculator", href: "/app/dividend-reinvestment-calculator", description: "Estimate dividend income, periodic payouts, and long-term compounding if dividends are reinvested.", premiumOnly: true },
  { label: "Investment Analyzer", href: "/app/investment-analyzer", description: "Analyze what a historical stock or ETF basket could be worth today.", premiumOnly: true },
  { label: "Debt Plan", href: "/app/tools/debt-plan", description: "Compare payoff strategies and monthly debt reduction plans." }
];

export default function ToolsPage() {
  const { accountStatus } = useWorkspaceUser();
  const canUsePremium = canUsePremiumTools(accountStatus?.role);

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Tools</h1>
        <p className="text-sm text-slate-600">Choose a planning tool to run focused calculations.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {toolLinks.map((tool) => {
          if (tool.premiumOnly && !canUsePremium) {
            return (
              <div key={tool.href} className="card border border-amber-200 bg-amber-50/70">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#0A2540]">{tool.label}</h2>
                  <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">Premium</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
                <p className="mt-3 text-sm text-amber-800">Available with Premium, Advisor, or Admin access.</p>
                <Link href={tool.href as Route} className="mt-4 inline-flex rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white">
                  Upgrade to Premium
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={tool.href}
              href={tool.href as Route}
            className="card border border-slate-200 transition-colors hover:border-slate-300"
          >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#0A2540]">{tool.label}</h2>
                {tool.premiumOnly ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">Premium</span> : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
