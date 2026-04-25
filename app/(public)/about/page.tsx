export default function AboutPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">About</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">Practical money clarity, by design</h1>
        <p className="mt-3 text-slate-600">
          Clarity Finance was built on a simple idea: most people don&apos;t need more financial dashboards — they need a clear
          picture and a confident next step. We translate the messy reality of income, expenses, debt, and goals into a
          single score and a guided plan you can actually act on.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Clarity over noise</h2>
          <p className="mt-2 text-sm text-slate-600">One score, one snapshot, one next step. No dashboards full of numbers you don&apos;t use.</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Practical, not preachy</h2>
          <p className="mt-2 text-sm text-slate-600">Every recommendation maps to your real numbers and your stated goals — not generic advice.</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Global by default</h2>
          <p className="mt-2 text-sm text-slate-600">Designed to work whether you&apos;re in the U.S. or anywhere lending criteria differ.</p>
        </div>
      </div>
    </div>
  );
}
