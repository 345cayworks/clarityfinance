import Link from "next/link";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";

export default function LoanReadinessTransitionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bank Readiness Review</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Loan Readiness has moved into the Loan Application Preparation Form.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your readiness summary, financial summary, and document checklist are now included there so the bank-facing workflow stays in one preparation packet.
        </p>
        <div className="mt-5">
          <Link
            href="/app/loan-application"
            className="inline-flex rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Open Loan Application Form
          </Link>
        </div>
      </div>
      <DecisionBoundaryNotice context="loan" />
    </div>
  );
}
