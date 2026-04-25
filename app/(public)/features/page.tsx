const features = [
  {
    title: "Onboarding wizard",
    description:
      "A guided multi-section profile that captures market, income, expenses, debt, housing, savings, and goals."
  },
  {
    title: "Clarity dashboard",
    description:
      "Live cash flow, debt pressure, runway and a single Clarity Score so you see your full picture at a glance."
  },
  {
    title: "Mortgage tools",
    description:
      "Affordability, refinance comparison, and rent-a-room impact — calibrated for U.S. and non-U.S. markets."
  },
  {
    title: "Debt plan",
    description:
      "Snowball and avalanche estimates with projected payoff timelines based on your real balances."
  },
  {
    title: "Scenarios",
    description:
      "Model what-if changes to income, expenses, debt, rate, and savings — and save the ones worth chasing."
  },
  {
    title: "Action plan & reports",
    description:
      "Auto-generated 30/90/12-month plans plus a printable snapshot you can share with a partner or advisor."
  }
];

export default function FeaturesPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Features</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">A full toolkit for personal financial clarity</h1>
        <p className="mt-3 text-slate-600">
          Every feature is connected to your profile so the numbers stay consistent across the dashboard, calculators,
          scenarios, and action plan.
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
    </div>
  );
}
