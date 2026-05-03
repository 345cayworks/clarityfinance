const features = [
  {
    title: "Guided financial onboarding",
    description:
      "Capture the details that matter: personal profile, contact information, up to three income sources, expenses, housing, debts, savings, goals, and document readiness."
  },
  {
    title: "Connected dashboard",
    description:
      "Turn profile data into a practical view of monthly income, cash flow, debt pressure, savings position, housing profile, and progress toward your next financial goal."
  },
  {
    title: "Report center",
    description:
      "Generate and review core reports including Financial Snapshot, Expense Report, Bank Loan Readiness, Loan Document Checklist, Rent a Room Scenario, Savings & Cash Flow, Debt & Liability, and Housing & Equity."
  },
  {
    title: "Loan readiness workflow",
    description:
      "Prepare the information a lender or advisor needs: loan purpose, requested amount, contribution, security offered, document checklist, and readiness summaries."
  },
  {
    title: "Scenario tools",
    description:
      "Model practical changes such as rent-a-room income, mortgage affordability, refinance options, debt reduction, savings targets, and monthly cash-flow improvement."
  },
  {
    title: "Advisor request system",
    description:
      "Users can request advisor support, while advisors and admins can review cases, update statuses, add notes, and manage assigned requests."
  },
  {
    title: "Action plan generator",
    description:
      "Convert the financial profile into next steps across short-term, medium-term, and longer-term priorities so users know what to work on next."
  },
  {
    title: "Admin and approval controls",
    description:
      "Admin tools support account approvals, role management, advisor assignment, user visibility, and platform oversight as the service grows."
  }
];

export default function FeaturesPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Features</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">A financial profile, reporting, and loan-readiness workspace</h1>
        <p className="mt-3 text-slate-600">
          Clarity Finance is built to help users organize their real financial picture, understand where they stand, generate
          useful reports, test practical scenarios, and move toward advisor-supported loan readiness.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <article key={feature.title} className="card transition-shadow hover:shadow-md">
            <h2 className="text-lg font-semibold text-[#0A2540]">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
        <h2 className="text-xl font-semibold text-[#0A2540]">What the platform helps answer</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <p>Can I clearly explain my income, expenses, debt, and savings position?</p>
          <p>What documents and profile details do I still need before approaching a lender?</p>
          <p>Would a scenario like rent-a-room income or debt reduction improve my readiness?</p>
        </div>
      </section>
    </div>
  );
}
