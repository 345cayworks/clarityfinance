export default function AboutPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">About</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">Built for people who need clarity before they make a financial move</h1>
        <p className="mt-3 text-slate-600">
          Clarity Finance is not just another budget screen. It is a guided workspace for organizing the financial facts that
          matter before a loan, mortgage, advisor conversation, or major money decision. The platform helps users collect their
          numbers, see their position, generate useful reports, and prepare for a more informed next step.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Start with the whole picture</h2>
          <p className="mt-2 text-sm text-slate-600">
            Users build a profile across income sources, expenses, debts, savings, housing, goals, loan details, and documents.
          </p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Turn data into usable reports</h2>
          <p className="mt-2 text-sm text-slate-600">
            Reports help users review their financial snapshot, expenses, loan readiness, document gaps, cash flow, debt, and housing position.
          </p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Create a path to support</h2>
          <p className="mt-2 text-sm text-slate-600">
            Advisor request, case review, notes, assignments, and admin controls create a bridge from self-service to guided review.
          </p>
        </div>
      </div>
      <section className="card bg-slate-50">
        <h2 className="text-xl font-semibold text-[#0A2540]">What has been built so far</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The current platform includes public education pages, secure signup and login, account approval controls, guided onboarding,
          dashboard views, scenario tools, a rent-a-room income model, loan readiness workflows, report generation, advisor requests,
          advisor case management, and admin account oversight. The goal is simple: help users become more organized, more prepared,
          and easier to support when they are ready for review.
        </p>
      </section>
    </div>
  );
}
