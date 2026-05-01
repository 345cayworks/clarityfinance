"use client";

import { useEffect, useMemo, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import { calculateApprovalReadinessScore } from "@/lib/finance/approval-score";
import { CNBApplication, mapProfileToCNBApplication } from "@/lib/finance/cnb-mapper";
import { formatMoney, formatNumber, formatPercent } from "@/lib/finance/format";
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


const toYesNoNotProvided = (value: unknown) => (value === true ? "Yes" : value === false ? "No" : "Not provided");

function Section({ title, children, breakBefore = false }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className={`rounded-xl border border-slate-300 bg-white p-4 ${breakBefore ? "print:break-before-page" : ""}`}>
      <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-black">{title}</h2>
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-300 px-3 py-2 text-sm">
      <p className="text-xs uppercase text-slate-600">{label}</p>
      <p className="font-medium text-black">{String(value || "—")}</p>
    </div>
  );
}

export default function LoanApplicationPage() {
  const [appData, setAppData] = useState<CNBApplication | null>(null);
  const [payload, setPayload] = useState<SavedOnboardingData | null>(null);
  const [exportMode, setExportMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user) return;
      const token = await getIdentityToken(user);
      if (!token) return;
      const response = await fetch("/.netlify/functions/profile-get", { method: "GET", credentials: "same-origin", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const result = (await response.json()) as SavedOnboardingData;
      setPayload(result);
      setAppData(mapProfileToCNBApplication(result));
    };
    void load();
  }, []);

  const readinessProfile = useMemo(() => (payload ? buildLoanReadinessProfile(payload) : null), [payload]);
  const approvalScore = useMemo(() => (readinessProfile ? calculateApprovalReadinessScore(readinessProfile) : null), [readinessProfile]);

  if (!appData || !readinessProfile || !approvalScore) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading application...</div>;

  const bankSummary = `Loan readiness ${approvalScore.band} (${approvalScore.score}/100). Income ${formatMoney(readinessProfile.financials.monthlyIncomeUsed)}, expenses ${formatMoney(
    readinessProfile.financials.monthlyExpenses
  )}, debt payments ${formatMoney(readinessProfile.financials.monthlyDebtPayments)}, surplus ${formatMoney(
    readinessProfile.financials.monthlySurplus
  )}, DTI (debt payments only) ${formatPercent((readinessProfile.ratios.debtToIncome ?? 0) * 100)}, housing ratio (rent/mortgage only) ${formatPercent((readinessProfile.ratios.housingRatio ?? 0) * 100)}, total monthly pressure ${formatPercent((readinessProfile.ratios.totalObligationsRatio ?? 0) * 100)}.`;


  const bandStyle = (band: string) => {
    if (band === "Likely Ready")
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (band === "Needs Review")
      return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-red-100 text-red-800 border border-red-200";
  };

  const onExportPdf = () => {
    setExportMode(true);
    window.setTimeout(() => {
      window.print();
      setExportMode(false);
    }, 50);
  };

  return (
    <div className={`space-y-4 ${exportMode ? "print-export-mode" : ""}`}>
      <div className="rounded-2xl border border-black bg-white p-6 text-black">
        <p className="text-xs uppercase tracking-[0.16em]">Loan Application Preparation Form</p>
        <h1 className="mt-2 text-2xl font-semibold">Prepared for bank review. Applicant must verify all details before submission.</h1>
        <p className="mt-2 text-sm">Readiness: <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${bandStyle(approvalScore.band)}`}>{approvalScore.band}</span> ({formatNumber(approvalScore.score)}/100)</p>
        <p className="mt-1 text-xs">This score is an estimate only and does not represent a bank decision.</p>
      </div>

      <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Print / Save as PDF</button>
          <button onClick={async () => navigator.clipboard.writeText(bankSummary)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Copy Bank Summary</button>
          <button onClick={onExportPdf} className="rounded-lg border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90">Export Loan Application PDF</button>
        </div>
      </div>

      <Section title="1. Customer Information">
        <Row label="Full name" value={readinessProfile.applicant.name} />
        <Row label="Date of birth" value={readinessProfile.applicant.dateOfBirth} />
        <Row label="Phone" value={readinessProfile.applicant.phone} />
        <Row label="Email" value={readinessProfile.applicant.email} />
        <Row label="Physical address" value={readinessProfile.applicant.physicalAddress} />
        <Row label="Mailing address" value={readinessProfile.applicant.mailingAddress} />
      </Section>

      <Section title="2. Employment Information">
        <Row label="Employment type" value={readinessProfile.employment.employmentType} />
        <Row label="Employer" value={readinessProfile.employment.employer} />
        <Row label="Job title" value={readinessProfile.employment.jobTitle} />
        <Row label="Employment length" value={readinessProfile.employment.employmentLength} />
        <Row label="Gross income" value={formatMoney(readinessProfile.financials.monthlyGrossIncome)} />
        <Row label="Net income" value={formatMoney(readinessProfile.financials.monthlyNetIncome)} />
      </Section>

      <Section title="3. Co-applicant Section (Placeholder)">
        <Row label="Co-applicant name" value="____________________" />
        <Row label="Co-applicant contact" value="____________________" />
      </Section>

      <Section title="4. Banking Information" breakBefore>
        <Row label="Primary bank" value={appData.banking.primaryBanker} />
        <Row label="Existing relationship" value={String(payload?.profile?.existing_bank_relationship ? "Yes" : "No")} />
        <Row label="Bank statements available" value={String(payload?.profile?.bank_statements_available ? "Yes" : "No")} />
      </Section>

      <Section title="5. Loan Details">
        <Row label="Loan purpose" value={readinessProfile.loan.loanPurpose} />
        <Row label="Requested amount" value={formatMoney(readinessProfile.loan.requestedLoanAmount)} />
        <Row label="Purchase price" value={formatMoney(readinessProfile.loan.purchasePrice)} />
        <Row label="Down payment available" value={formatMoney(readinessProfile.loan.downPaymentAvailable)} />
        <Row label="Down payment %" value={formatPercent(readinessProfile.loan.downPaymentPercent * 100)} />
        <Row label="Loan-to-value" value={formatPercent((readinessProfile.loan.loanToValue ?? 0) * 100)} />
      </Section>

      <Section title="6. Statement of Affairs">
        <Row label="Monthly income used" value={formatMoney(readinessProfile.financials.monthlyIncomeUsed)} />
        <Row label="Monthly expenses" value={formatMoney(readinessProfile.financials.monthlyExpenses)} />
        <Row label="Housing payment" value={formatMoney(readinessProfile.financials.housingPayment)} />
        <Row label="Monthly debt payments" value={formatMoney(readinessProfile.financials.monthlyDebtPayments)} />
        <Row label="Monthly surplus" value={formatMoney(readinessProfile.financials.monthlySurplus)} />
      </Section>

      <Section title="7. Assets">
        <Row label="Bank balances" value={formatMoney(readinessProfile.financials.bankBalances)} />
        <Row label="Investments" value={formatMoney(readinessProfile.financials.totalInvestments)} />
        <Row label="Real estate" value={formatMoney(readinessProfile.housing.estimatedHomeValue)} />
        <Row label="Total assets" value={formatMoney(readinessProfile.financials.totalAssets)} />
      </Section>

      <Section title="8. Liabilities" breakBefore>
        <Row label="Mortgages" value={formatMoney(readinessProfile.financials.mortgages)} />
        <Row label="Other debts" value={formatMoney(readinessProfile.financials.otherDebt)} />
        <Row label="Total liabilities" value={formatMoney(readinessProfile.financials.totalLiabilities)} />
        <Row label="Net worth" value={formatMoney(readinessProfile.financials.netWorth)} />
        <Row label="Debt-to-Income (debt payments only)" value={formatPercent((readinessProfile.ratios.debtToIncome ?? 0) * 100)} />
        <Row label="Housing Ratio (rent/mortgage only)" value={formatPercent((readinessProfile.ratios.housingRatio ?? 0) * 100)} />
        <Row label="Total Monthly Pressure (living + housing + debt payments)" value={formatPercent((readinessProfile.ratios.totalObligationsRatio ?? 0) * 100)} />
      </Section>

      <Section title="9. Property Held">
        <Row label="Housing status" value={readinessProfile.housing.housingStatus} />
        <Row label="Estimated home value" value={formatMoney(readinessProfile.housing.estimatedHomeValue)} />
        <Row label="Mortgage balance" value={formatMoney(readinessProfile.housing.mortgageBalance)} />
        <Row label="Estimated equity" value={formatMoney(readinessProfile.housing.equity)} />
      </Section>

      <Section title="10. Documents Checklist">
        <div className="md:col-span-2 space-y-2 rounded border border-slate-300 bg-white p-3 text-black">
          {[
            ["Government-issued ID", payload?.profile?.has_id],
            ["Proof of address", payload?.profile?.has_proof_of_address],
            ["Employment letter", payload?.profile?.has_employment_letter],
            ["Recent payslips", payload?.profile?.has_payslips],
            ["3–6 months bank statements", payload?.profile?.has_bank_statements],
            ["Existing loan/debt statements", payload?.profile?.has_debt_statements],
            ["Credit report / credit profile", payload?.profile?.has_credit_report],
            ["Proof/source of down payment", payload?.profile?.has_down_payment_proof],
            ["Purchase agreement or property details", payload?.profile?.has_purchase_agreement],
            ["Property valuation/appraisal", payload?.profile?.has_valuation],
            ["Business registration and financials if self-employed", payload?.profile?.has_business_financials],
            ["Tax returns if required", payload?.profile?.has_tax_returns],
            ["Work permit if applicable", payload?.profile?.work_permit_required],
          ].map(([item, value]) => (
            <p key={String(item)} className="border-b border-slate-200 py-2 text-sm last:border-b-0 print:py-3">
              {String(item)}: <span className="font-medium">{toYesNoNotProvided(value)}</span>
            </p>
          ))}
        </div>
      </Section>

      <Section title="11. Declarations / Signature">
        <Row label="Applicant signature" value="______________________________" />
        <Row label="Date" value="______________________________" />
        <Row label="Officer notes" value="________________________________________________" />
      </Section>

      <style jsx global>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .print\:hidden { display: none !important; }
          .print\:break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  );
}
