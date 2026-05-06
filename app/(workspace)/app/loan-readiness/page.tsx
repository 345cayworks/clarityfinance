"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import { calculateApprovalReadinessScore } from "@/lib/finance/approval-score";
import { formatMoney, formatPercent } from "@/lib/finance/format";
import { buildLoanReadinessProfile } from "@/lib/finance/loan-readiness-mapper";

type SavedOnboardingData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
};

const DOCUMENT_CHECKLIST = [
  { key: "hasID", label: "Government ID" },
  { key: "hasProofOfAddress", label: "Proof of address" },
  { key: "hasPayslips", label: "Payslips" },
  { key: "hasEmploymentLetter", label: "Employment letter" },
  { key: "hasBankStatements", label: "Bank statements" },
  { key: "hasDebtStatements", label: "Debt statements" },
  { key: "hasCreditReport", label: "Credit report" },
  { key: "hasDownPaymentProof", label: "Proof/source of down payment" },
  { key: "hasPurchaseAgreement", label: "Purchase agreement/property details" },
  { key: "hasValuation", label: "Valuation/appraisal" },
  { key: "hasBusinessFinancials", label: "Business financials if self-employed" }
] as const;

export default function LoanReadinessPage() {
  const [payload, setPayload] = useState<SavedOnboardingData | null>(null);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<"none" | "save" | "advisor">("none");
  const [shareConsent, setShareConsent] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user) return;
      const token = await getIdentityToken(user);
      if (!token) return;
      const response = await fetch("/.netlify/functions/profile-get", {
        method: "GET",
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      setPayload((await response.json()) as SavedOnboardingData);
    };
    void load();
  }, []);

  const readinessProfile = useMemo(() => (payload ? buildLoanReadinessProfile(payload) : null), [payload]);
  const approvalScore = useMemo(
    () => (readinessProfile ? calculateApprovalReadinessScore(readinessProfile) : null),
    [readinessProfile]
  );

  const checklist = useMemo(
    () => DOCUMENT_CHECKLIST.map((item) => ({ ...item, present: Boolean(readinessProfile?.documents[item.key]) })),
    [readinessProfile]
  );

  const missingDocuments = checklist.filter((item) => !item.present).map((item) => item.label);
  const downPaymentPercent = readinessProfile?.loan.purchasePrice ? readinessProfile.loan.downPaymentPercent : null;

  const householdExpenseCategories = useMemo(() => {
    const expenseProfile = payload?.expenseProfile ?? {};
    return [
      { key: "housing", label: "Housing", amount: Number(expenseProfile.housing ?? 0) || 0 },
      { key: "utilities", label: "Utilities", amount: Number(expenseProfile.utilities ?? 0) || 0 },
      { key: "transport", label: "Transport", amount: Number(expenseProfile.transport ?? 0) || 0 },
      { key: "groceries", label: "Groceries", amount: Number(expenseProfile.groceries ?? 0) || 0 },
      { key: "insurance", label: "Insurance", amount: Number(expenseProfile.insurance ?? 0) || 0 },
      { key: "childcare", label: "Childcare", amount: Number(expenseProfile.childcare ?? 0) || 0 },
      { key: "discretionary", label: "Discretionary", amount: Number(expenseProfile.discretionary ?? 0) || 0 },
      { key: "other", label: "Other", amount: Number(expenseProfile.other ?? 0) || 0 }
    ];
  }, [payload?.expenseProfile]);

  const householdExpensesTotal = useMemo(
    () => householdExpenseCategories.reduce((sum, item) => sum + item.amount, 0),
    [householdExpenseCategories]
  );

  const bankSummary = useMemo(() => {
    if (!readinessProfile || !approvalScore) return "";
    return `Loan readiness ${approvalScore.band} (${approvalScore.score}/100). Income ${formatMoney(
      readinessProfile.financials.monthlyIncomeUsed
    )}, expenses ${formatMoney(readinessProfile.financials.monthlyExpenses)}, debt payments ${formatMoney(
      readinessProfile.financials.monthlyDebtPayments
    )}, surplus ${formatMoney(readinessProfile.financials.monthlySurplus)}, DTI ${formatPercent(
      (readinessProfile.ratios.debtToIncome ?? 0) * 100
    )}, housing ratio ${formatPercent((readinessProfile.ratios.housingRatio ?? 0) * 100)}.`;
  }, [approvalScore, readinessProfile]);

  const withToken = async () => {
    const user = await getUser();
    if (!user) return null;
    const token = await getIdentityToken(user);
    return token ?? null;
  };

  const onSaveReadiness = async () => {
    if (!readinessProfile || !approvalScore) return;
    setBusy("save");
    setMessage("");
    try {
      const token = await withToken();
      if (!token) return;
      const response = await fetch("/.netlify/functions/loan-readiness-save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          preferredLender: readinessProfile.banking.primaryFinancialInstitution,
          loanType: readinessProfile.loan.propertyType,
          loanPurpose: readinessProfile.loan.loanPurpose,
          requestedAmount: readinessProfile.loan.requestedLoanAmount,
          purchasePrice: readinessProfile.loan.purchasePrice,
          downPaymentAvailable: readinessProfile.loan.downPaymentAvailable,
          loanTermYears: 30,
          estimatedInterestRate: 7,
          readinessScore: approvalScore.score,
          readinessBand: approvalScore.band,
          debtToIncome: readinessProfile.ratios.debtToIncome,
          housingRatio: readinessProfile.ratios.housingRatio,
          monthlyIncome: readinessProfile.financials.monthlyIncomeUsed,
          monthlyExpenses: readinessProfile.financials.monthlyExpenses,
          monthlyDebtPayments: readinessProfile.financials.monthlyDebtPayments,
          monthlySurplus: readinessProfile.financials.monthlySurplus,
          missingDocuments,
          checklist,
          application: { readinessProfile, approvalScore },
          status: "draft"
        })
      });
      const result = (await response.json()) as { id?: string; error?: string };
      setMessage(response.ok ? `Saved readiness snapshot (${result.id ?? "new"}).` : result.error ?? "Save failed.");
    } finally {
      setBusy("none");
    }
  };

  const onRequestAdvisor = async () => {
    if (!readinessProfile || !approvalScore) return;
    setBusy("advisor");
    setMessage("");
    try {
      const token = await withToken();
      if (!token) return;
      const reportResponse = await fetch("/.netlify/functions/loan-readiness-report-create", {
        method: "POST",
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });
      const reportData = (await reportResponse.json()) as { id?: string };
      const prequalificationShareUrl = reportData.id ? `/app/reports?reportId=${reportData.id}` : undefined;

      const response = await fetch("/.netlify/functions/advisor-request-save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic: "Loan Readiness Review",
          urgency: "medium",
          sourceContext: "loan_readiness",
          message: bankSummary,
          consentToReview: shareConsent,
          consentMetadata: {
            recipientType: "advisor",
            recipientName: "Assigned advisor",
            sourceContext: "loan_readiness",
            artifactId: reportData.id ?? null,
            consentVersion: "data-sharing-consent-v1",
            sharedScope: {
              readinessSummary: true,
              financialSnapshot: true,
              supportingInformation: true,
              reportUrl: Boolean(prequalificationShareUrl)
            }
          },
          prequalificationShareUrl,
          recommendation: {
            score: approvalScore.score,
            band: approvalScore.band,
            monthlyIncome: readinessProfile.financials.monthlyIncomeUsed,
            monthlyExpenses: readinessProfile.financials.monthlyExpenses,
            householdExpensesTotal,
            householdExpensesBreakdown: householdExpenseCategories,
            monthlyDebtPayments: readinessProfile.financials.monthlyDebtPayments,
            monthlySurplus: readinessProfile.financials.monthlySurplus,
            debtToIncome: readinessProfile.ratios.debtToIncome,
            housingRatio: readinessProfile.ratios.housingRatio,
            totalMonthlyPressure: readinessProfile.ratios.totalObligationsRatio,
            missingDocuments
          }
        })
      });
      setMessage(response.ok ? "Advisor review requested." : "Could not create advisor request.");
    } finally {
      setBusy("none");
    }
  };

  if (!readinessProfile || !approvalScore) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading loan readiness hub...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-wider text-slate-500">Premium Module</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Loan Readiness Hub</h1>
        <p className="mt-3 text-sm text-slate-600">Readiness score: <span className="font-semibold text-slate-900">{approvalScore.score}/100</span> · Band: <span className="font-semibold text-slate-900">{approvalScore.band}</span></p>
      </section>
      <DecisionBoundaryNotice context="loan" />

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Financial Summary</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>Monthly income: <strong>{formatMoney(readinessProfile.financials.monthlyIncomeUsed)}</strong></div>
          <div>Monthly expenses: <strong>{formatMoney(readinessProfile.financials.monthlyExpenses)}</strong></div>
          <div>Monthly debt payments: <strong>{formatMoney(readinessProfile.financials.monthlyDebtPayments)}</strong></div>
          <div>Monthly surplus: <strong>{formatMoney(readinessProfile.financials.monthlySurplus)}</strong></div>
          <div>Debt-to-Income (debt payments only): <strong>{formatPercent((readinessProfile.ratios.debtToIncome ?? 0) * 100)}</strong></div>
          <div>Housing Ratio (rent/mortgage only): <strong>{formatPercent((readinessProfile.ratios.housingRatio ?? 0) * 100)}</strong></div>
          <div>Total Monthly Pressure (living + housing + debt): <strong>{formatPercent((readinessProfile.ratios.totalObligationsRatio ?? 0) * 100)}</strong></div>
          {downPaymentPercent !== null ? <div>Down payment %: <strong>{formatPercent(downPaymentPercent * 100)}</strong></div> : null}
        </div>
      </section>


      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Household Expenses (from Profile)</h2>
        <div className="space-y-2 text-sm">
          <p>Total monthly household expenses: <strong>{formatMoney(householdExpensesTotal)}</strong></p>
          {householdExpensesTotal <= 0 ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">Missing data: no household expenses found in your profile yet.</p>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {householdExpenseCategories.map((item) => (
              <li key={item.key} className="rounded border p-2">
                {item.label}: <strong>{formatMoney(item.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/app/onboarding" className="rounded border px-3 py-2 hover:bg-slate-50">Edit in Profile</Link>
          <Link href="/app/onboarding" className="rounded border px-3 py-2 hover:bg-slate-50">Quick Update Expenses</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Document Checklist</h2>
        <ul className="grid gap-2 md:grid-cols-2 text-sm">
          {checklist.map((item) => (
            <li key={item.key} className={`rounded border p-2 ${item.present ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              {item.label}: <strong>{item.present ? "Provided" : "Missing"}</strong>
            </li>
          ))}
        </ul>
        {missingDocuments.length > 0 ? (
          <p className="mt-3 text-sm text-red-700">Missing documents: {missingDocuments.join(", ")}.</p>
        ) : (
          <p className="mt-3 text-sm text-emerald-700">All listed documents are present.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold">Action Recommendations</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {approvalScore.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
        <h2 className="mb-3 text-base font-semibold">Actions</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/app/onboarding" className="rounded border px-3 py-2 hover:bg-slate-50">Update Profile</Link>
          <Link href="/app/loan-application" className="rounded border px-3 py-2 hover:bg-slate-50">Open Bank Application Preparation Form</Link>
          <Link href="/app/prequalification/proven-bank" className="rounded border px-3 py-2 hover:bg-slate-50">Open Proven Bank Readiness Review</Link>
          <button onClick={async () => navigator.clipboard.writeText(bankSummary)} className="rounded border px-3 py-2 hover:bg-slate-50">Copy Bank Summary</button>
          <button onClick={() => window.print()} className="rounded border px-3 py-2 hover:bg-slate-50">Print / Save Summary</button>
          <button onClick={onSaveReadiness} disabled={busy !== "none"} className="rounded border px-3 py-2 hover:bg-slate-50 disabled:opacity-60">Save Readiness Snapshot</button>
          <button onClick={onRequestAdvisor} disabled={busy !== "none" || !shareConsent} className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60">Request Advisor Review</button>
        </div>
        <label className="mt-3 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={shareConsent} onChange={(event) => setShareConsent(event.target.checked)} className="mt-1" />
          <span>I authorize Clarity Finance to share the selected readiness summary, financial snapshot, and supporting information with the assigned advisor or selected financial institution for review. I understand this is not a loan approval or investment recommendation.</span>
        </label>
        {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      </section>
    </div>
  );
}
