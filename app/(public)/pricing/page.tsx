import Link from "next/link";
import Script from "next/script";

const plusFeatures = [
  "Financial profile dashboard",
  "Bank loan readiness report",
  "Savings runway tracker",
  "Mortgage tools",
  "Cash-out refinance evaluator",
  "Action plan guidance",
  "Goal tracking"
];

const advisorTopics = [
  "Advisor support",
  "Loan readiness",
  "Mortgage planning",
  "Cash-out refinance",
  "Debt reduction",
  "Savings plan",
  "Other"
];

export default function PricingPage() {
  return (
    <div className="space-y-10 pt-10">
      <Script async src="https://js.stripe.com/v3/buy-button.js" />

      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">Choose your support level</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Two clear options: self-serve Plus or advisor-guided support.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="card flex flex-col border-blue-200 ring-1 ring-blue-200 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0A2540]">Clarity Finance Plus</h2>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">Popular</span>
          </div>
          <p className="mt-5">
            <span className="text-3xl font-semibold text-[#0A2540]">$79</span>
            <span className="ml-1 text-sm text-slate-500">/ month</span>
          </p>
          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            {plusFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                    <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
            <stripe-buy-button
              buy-button-id="buy_btn_1TQKRzQPly5CvgcZr3JQyZrY"
              publishable-key="pk_live_51PMEpzQPly5CvgcZyA2elZHoVs7oauf6YKFxBVi6UAsRsstIXAUCBt1PhzxFg2fugg5iUXtRpX7koBndarCrMHAs00kyQHV89M"
            />
          </div>
        </article>

        <article className="card flex flex-col">
          <h2 className="text-lg font-semibold text-[#0A2540]">Advisor Support</h2>
          <p className="mt-2 text-sm text-slate-600">
            Personal review and guidance for your financial profile and loan readiness.
          </p>
          <p className="mt-5">
            <span className="text-3xl font-semibold text-[#0A2540]">Contact us</span>
          </p>
          <div className="mt-6">
            <Link
              href="#contact"
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
            >
              Contact Us
            </Link>
          </div>
        </article>
      </section>

      <section id="contact" className="card scroll-mt-24">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Request Advisor Support</h2>
        <p className="mt-2 text-sm text-slate-600">Submit the form and we&apos;ll follow up shortly.</p>

        <form
          name="advisor-contact"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          action="/success"
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="form-name" value="advisor-contact" />
          <p hidden>
            <label>
              Don&apos;t fill this out: <input name="bot-field" />
            </label>
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              placeholder="Full Name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="phone"
              placeholder="Phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <select
              name="helpTopic"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">What do you need help with?</option>
              {advisorTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          <textarea
            name="message"
            placeholder="Tell us about your situation"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            rows={6}
          />

          <button
            type="submit"
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0e3160]"
          >
            Request Advisor Support
          </button>
        </form>
      </section>
    </div>
  );
}
