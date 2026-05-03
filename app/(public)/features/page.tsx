const features = [
  {
    title: "Guided financial profile",
    description:
      "Capture income, expenses, housing, debts, savings, goals, loan details, and document readiness in one organized flow."
  },
  {
    title: "Income source tracking",
    description:
      "Record up to three income sources so summaries and reports reflect total monthly income instead of only one job or payment stream."
  },
  {
    title: "Dashboard view",
    description:
      "Review cash flow, debt pressure, savings, housing, and profile information from a connected workspace built around the user’s own numbers."
  },
  {
    title: "Report center",
    description:
      "Create Financial Snapshot, Expense, Bank Loan Readiness, Document Checklist, Rent a Room Scenario, Savings & Cash Flow, Debt & Liability, and Housing & Equity reports."
  },
  {
    title: "Scenario tools",
    description:
      "Explore rent-a-room income, mortgage affordability, refinance options, debt planning, savings targets, and monthly cash-flow changes."
  },
  {
    title: "Loan readiness workflow",
    description:
      "Organize requested loan amount, contribution, security offered, loan purpose, and supporting document status before review conversations."
  },
  {
    title: "Advisor request workflow",
    description:
      "Users can request advisor support, while advisors and admins can review cases, update statuses, add notes, and manage assignments."
  },
  {
    title: "Admin controls",
    description:
      "Support account approvals, user roles, advisor assignment, case visibility, and platform oversight as the service grows."
  }
];

export default function FeaturesPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Features</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">A clearer way to organize finances before the next big move</h1>
        <p className="mt-3 text-slate-600">
          Clarity Finance brings profile building, dashboard insights, scenario planning, reports, and advisor workflows into one
          connected platform so users can understand where they stand and what information is still missing.
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
        <h2 className="text-xl font-semibold text-[#0A2540]">Built around real questions</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <p>What is my real monthly income and cash-flow position?</p>
          <p>Which documents and details do I still need to organize?</p>
          <p>Could a practical scenario improve my overall position?</p>
        </div>
      </section>
    </div>
  );
}
