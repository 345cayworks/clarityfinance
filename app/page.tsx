import Link from "next/link";

const features = [
  "Track your full monthly picture",
  "Calculate mortgage, refinance, and debt scenarios",
  "Generate a personalized 30-90-12 month action plan"
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brandTeal">Clarity Finance</p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">Know where you stand. Know what&apos;s next.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">A front-end-first finance planning workspace for cash flow, debt strategy, and home readiness.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="btn-primary" href="/signup">Get started</Link>
          <Link className="btn-secondary" href="/login">Sign in</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-16 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature} className="card">
            <h3 className="text-base font-semibold text-slate-900">Feature</h3>
            <p className="mt-2 text-sm text-slate-600">{feature}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
