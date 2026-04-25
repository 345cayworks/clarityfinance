import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid gap-8 md:grid-cols-2 md:items-center">
      <div>
        <h1 className="text-4xl font-bold text-[#0A2540]">Know where you stand. Know what&apos;s next.</h1>
        <p className="mt-4 text-slate-600">Clarity Finance helps you understand your current financial position and move through a practical roadmap with confidence.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-white">Get Started</Link>
          <Link href="/features" className="rounded-lg border border-slate-300 px-4 py-2">Explore Features</Link>
        </div>
      </div>
      <div className="card">
        <p className="text-sm text-slate-500">Live Snapshot</p>
        <p className="mt-2 text-2xl font-semibold">Clarity Score: 78</p>
        <p className="mt-2 text-sm text-slate-600">Premium dashboard, practical scenarios, and guided action plans in one place.</p>
      </div>
    </section>
  );
}
