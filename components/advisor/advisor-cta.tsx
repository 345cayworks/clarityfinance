"use client";
import Link from "next/link";

export function AdvisorCta({ context, title, description, recommendedPackage, urgencyLevel }: { context: string; title: string; description: string; recommendedPackage: string; urgencyLevel: "low"|"medium"|"high"; }) {
  const tone = urgencyLevel === "high" ? "border-amber-300 bg-amber-50" : urgencyLevel === "medium" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white";
  return <section className={`rounded-2xl border p-4 ${tone}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Advisor support · {context}</p>
    <h3 className="mt-1 text-lg font-semibold text-[#0A2540]">{title}</h3>
    <p className="mt-1 text-sm text-slate-700">{description}</p>
    <p className="mt-2 text-xs text-slate-600">Recommended package: <strong>{recommendedPackage}</strong> · Urgency: {urgencyLevel}</p>
    <div className="mt-3 flex gap-2"><Link href="/app/advisor/request" className="rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white">Request Advisor Review</Link><Link href="/pricing" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Advisor Session Payment</Link></div>
  </section>;
}
