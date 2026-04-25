import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    description: "Get clarity on your full financial picture with the core toolkit.",
    cta: "Start free",
    highlighted: false,
    features: ["Onboarding profile", "Clarity dashboard", "Mortgage & debt calculators", "1 saved scenario"]
  },
  {
    name: "Plus",
    price: "$9",
    cadence: "per month",
    description: "Unlimited scenarios, action plans and exportable reports.",
    cta: "Coming soon",
    highlighted: true,
    features: [
      "Everything in Free",
      "Unlimited saved scenarios",
      "Auto-generated 30/90/365-day plans",
      "PDF report exports",
      "Priority support"
    ]
  },
  {
    name: "Advisor",
    price: "Custom",
    cadence: "talk to us",
    description: "For coaches, advisors and partners who manage multiple households.",
    cta: "Contact us",
    highlighted: false,
    features: ["Everything in Plus", "Multi-household workspace", "White-label exports", "Custom integrations"]
  }
];

export default function PricingPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0A2540]">Simple plans, real value</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Start free. Upgrade when you want unlimited scenarios, generated action plans and exportable reports.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`card flex flex-col ${
              tier.highlighted
                ? "border-blue-200 ring-1 ring-blue-200 shadow-md"
                : ""
            }`}
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
              <span className="ml-1 text-sm text-slate-500">{tier.cadence}</span>
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
            <div className="mt-6">
              <Link
                href="/signup"
                className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-[#0A2540] text-white hover:bg-[#0e3160]"
                    : "border border-slate-300 text-slate-700 hover:border-slate-400"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
