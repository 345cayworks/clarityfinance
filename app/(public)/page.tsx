import Link from "next/link";

const featureCards = [
  {
    title: "Get financially organized",
    description: "Build one complete profile for income, expenses, debt, savings, housing, documents, goals, and loan details.",
    icon: (
      <path
        d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.5-7.5-2.8 2.8M9.3 14.7l-2.8 2.8m0-13 2.8 2.8m5.4 5.4 2.8 2.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    )
  },
  {
    title: "Understand your position",
    description: "See your income, cash flow, debt pressure, savings progress, housing position, and report history in one workspace.",
    icon: (
      <path
        d="M3 17V7m0 10h18M3 17l5-5 4 3 5-7 4 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  },
  {
    title: "Prepare your next move",
    description: "Generate reports, review document readiness, model rent-a-room income, and request advisor support when ready.",
    icon: (
      <path
        d="M9 11l3 3 7-7M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
];

const metricsSnapshot = [
  { label: "Monthly Income", value: "$6.2k", tone: "text-emerald-600" },
  { label: "Cash Flow", value: "+$612", tone: "text-emerald-600" },
  { label: "Debt Pressure", value: "24%", tone: "text-amber-600" },
  { label: "Reports", value: "8", tone: "text-blue-600" }
];

export default function HomePage() {
  return (
    <div className="space-y-20 pt-10 md:pt-16">
      <section className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Financial clarity for loan-ready decisions
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#0A2540] md:text-5xl">
            Stop guessing. Know what your numbers are saying before you apply.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Clarity Finance helps you organize your financial profile, understand your monthly position, prepare useful reports,
            and see what needs attention before a loan, mortgage, advisor conversation, or major financial decision.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-[#0A2540] px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#0e3160]"
            >
              Start your financial profile
            </Link>
            <Link
              href="/features"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Built for financial organization, loan readiness, scenario planning, reports, and advisor-supported review.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-blue-100 via-teal-50 to-white blur-2xl" />
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Financial Readiness Snapshot</p>
                <p className="mt-1 text-2xl font-semibold text-[#0A2540]">One profile. Clearer decisions.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Profile active</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {metricsSnapshot.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{metric.label}</p>
                  <p className={`mt-1 text-xl font-semibold ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Next best step</p>
              <p className="mt-1 text-sm font-medium text-[#0A2540]">
                Review your income sources, complete the loan document checklist, and generate a Bank Loan Readiness Report
                before requesting advisor support.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">A clearer path from confusion to readiness</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#0A2540]">Organize. Understand. Prepare. Act.</h2>
          <p className="mt-3 text-slate-600">
            Clarity Finance connects the pieces people usually keep scattered: profile data, dashboard insights, reports,
            loan-readiness checks, scenario tools, and advisor requests.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <div key={feature.title} className="card transition-shadow hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  {feature.icon}
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[#0A2540]">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-4 bg-gradient-to-br from-[#0A2540] to-[#163763] text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Ready to see your financial picture clearly?</h3>
          <p className="mt-1 text-sm text-slate-200">
            Start with your profile. Then use the dashboard, reports, and scenarios to decide your next move.
          </p>
        </div>
        <Link
          href="/signup"
          className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0A2540] shadow-md transition-transform hover:scale-[1.02]"
        >
          Build my profile
        </Link>
      </section>
    </div>
  );
}
