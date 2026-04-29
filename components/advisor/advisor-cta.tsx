"use client";
import Link from "next/link";
import Script from "next/script";

export function AdvisorCta({ context, title, description, recommendedPackage, urgencyLevel }: { context: string; title: string; description: string; recommendedPackage: string; urgencyLevel: "low"|"medium"|"high"; }) {
  const tone = urgencyLevel === "high" ? "border-amber-300 bg-amber-50" : urgencyLevel === "medium" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white";
  return <section className={`rounded-2xl border p-4 ${tone}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Advisor support · {context}</p>
    <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">{title}</h3>
    <p className="mt-1 text-sm text-slate-700">{description}</p>
    <p className="mt-2 text-xs text-slate-600">Recommended package: <strong>{recommendedPackage}</strong> · Urgency: {urgencyLevel}</p>
    <div className="mt-3 flex gap-2"><Link href="/app/advisor/request" className="rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white">Request Advisor Review</Link></div>
    <p className="mt-3 text-xs text-slate-600">Advisor session payment is processed securely through Fygaro.</p>
    <Script src="https://api.fygaro.com/api/v1/payments/payment-button/dc86510d-39bc-4910-b8a8-b8f829967219/render/" strategy="afterInteractive" />
  </section>;
}
