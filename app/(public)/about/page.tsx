export default function AboutPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">About</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">Built to turn financial confusion into a usable plan</h1>
        <p className="mt-3 text-slate-600">
          Clarity Finance was created for people who need more than a basic budget tracker. The platform helps users collect
          their financial facts, understand their current position, prepare lender-ready reports, and move through a guided
          path toward better cash flow, stronger documentation, and loan readiness.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Profile first</h2>
          <p className="mt-2 text-sm text-slate-600">
            The app starts by building a complete profile across income, expenses, debt, housing, savings, goals, and documents.
          </p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Reports that make sense</h2>
          <p className="mt-2 text-sm text-slate-600">
            Users can turn their profile into practical reports for review, planning, advisor conversations, and loan preparation.
          </p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Support when ready</h2>
          <p className="mt-2 text-sm text-slate-600">
            Advisor request and admin tools create a path for guided review without losing the user&apos;s self-service experience.
          </p>
        </div>
      </div>
      <section className="card bg-slate-50">
        <h2 className="text-xl font-semibold text-[#0A2540]">What we have built so far</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The current platform includes public education pages, secure signup and login, account approval controls, a guided
          onboarding profile, a dashboard, scenario tools, a rent-a-room income model, loan readiness workflows, report generation,
          advisor requests, advisor case management, and admin account oversight. The goal is to give users a structured way to
          organize their finances and give advisors better information when support is requested.
        </p>
      </section>
    </div>
  );
}
