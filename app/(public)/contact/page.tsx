import Link from "next/link";

const helpTopics = [
  "Advisor support",
  "Loan readiness",
  "Mortgage planning",
  "Cash-out refinance",
  "Debt reduction",
  "Savings plan",
  "Other"
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-10">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Contact</p>
        <h1 className="text-3xl font-semibold text-[#0A2540]">Talk with our team</h1>
        <p className="text-slate-600">Tell us what you need help with and we&apos;ll follow up.</p>
      </header>

      <section className="card">
        <form name="contact" method="POST" data-netlify="true" className="space-y-4">
          <input type="hidden" name="form-name" value="contact" />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Name
              <input
                type="text"
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                name="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Phone
              <input
                type="tel"
                name="phone"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Country/market
              <input
                type="text"
                name="country_market"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            What do you need help with?
            <select
              name="help_topic"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select one</option>
              {helpTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Message
            <textarea
              name="message"
              rows={6}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0e3160]"
          >
            Send message
          </button>
        </form>
      </section>

      <div className="text-center text-sm">
        <Link href="/pricing" className="font-medium text-blue-700 hover:text-blue-800">
          Back to pricing
        </Link>
      </div>
    </div>
  );
}
