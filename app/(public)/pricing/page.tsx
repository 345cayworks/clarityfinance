import Link from "next/link";
import Script from "next/script";

const tiers: Array<{
  name: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  highlighted: boolean;
  href: "/signup" | "/contact";
  features: string[];
}> = [
  {
    name: "Clarity Finance Plus",
    price: "$79",
    cadence: "/ month",
    description: "For individuals who want guided financial clarity, reports, tools, and action plans.",
    cta: "Subscribe to Plus",
    highlighted: true,
    href: "/signup",
    features: [
      "Financial profile dashboard",
      "Bank loan readiness report",
      "Savings runway tracker",
      "Mortgage and refinance tools",
      "Cash-out refinance evaluator",
      "Action plan recommendations",
      "Goal tracking"
    ]
  },
  {
    name: "Advisor Support",
    price: "Contact us",
    cadence: "",
    description: "For users who want personal review, coaching, or advisor-supported planning.",
    cta: "Contact Us",
    highlighted: false,
    href: "/contact",
    features: [
      "Personal financial profile review",
      "Loan readiness review",
      "Refinance/cash-out refinance discussion",
      "Debt and savings action review",
      "Custom next-step guidance"
    ]
  }
];

export default function PricingPage() {
  return (
    <div className="space-y-10 pt-10">
      <Script async src="https://js.stripe.com/v3/buy-button.js" />
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">Simple plans, real value</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Choose the path that fits your level of support.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`card flex flex-col ${tier.highlighted ? "border-blue-200 ring-1 ring-blue-200 shadow-md" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0A2540]">{tier.name}</h2>
              {tier.highlighted ? (
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">{tier.description}</p>
            <p className="mt-5">
              <span className="text-3xl font-semibold text-[#0A2540]">{tier.price}</span>
              {tier.cadence ? <span className="ml-1 text-sm text-slate-500">{tier.cadence}</span> : null}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {tier.features.map((feature) => (
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
            <div className="mt-6 space-y-3">
              <Link
                href={tier.href}
                className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-[#0A2540] text-white hover:bg-[#0e3160]"
                    : "border border-slate-300 text-slate-700 hover:border-slate-400"
                }`}
              >
                {tier.cta}
              </Link>
              {tier.name === "Clarity Finance Plus" ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  <stripe-buy-button
                    buy-button-id="buy_btn_1TQKRzQPly5CvgcZr3JQyZrY"
                    publishable-key="pk_live_51PMEpzQPly5CvgcZyA2elZHoVs7oauf6YKFxBVi6UAsRsstIXAUCBt1PhzxFg2fugg5iUXtRpX7koBndarCrMHAs00kyQHV89M"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
