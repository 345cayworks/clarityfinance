"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";
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
const formatRatio = (value: number | null | undefined) =>
  value === null || value === undefined ? "Missing income" : formatPercent(value * 100);

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
      <p className="font-medium text-black">{String(value || "-")}</p>
    </div>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return <h3 className="md:col-span-2 mt-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">{children}</h3>;
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

  const totalMonthlyIncome = appData.income.totalIncome;
  const nonHousingLivingExpenses = readinessProfile.financials.nonHousingLivingExpenses;
  const housingPayment = readinessProfile.financials.housingPayment;
  const monthlyDebtPayments = readinessProfile.financials.monthlyDebtPayments;
  const totalMonthlyObligations = housingPayment + nonHousingLivingExpenses + monthlyDebtPayments;
  const monthlySurplus = totalMonthlyIncome - totalMonthlyObligations;
  const debtToIncome = totalMonthlyIncome > 0 ? monthlyDebtPayments / totalMonthlyIncome : null;
  const housingRatio = totalMonthlyIncome > 0 ? housingPayment / totalMonthlyIncome : null;
  const totalMonthlyPressure = totalMonthlyIncome > 0 ? totalMonthlyObligations / totalMonthlyIncome : null;
  const downPaymentPercent = readinessProfile.loan.purchasePrice > 0 ? readinessProfile.loan.downPaymentPercent : null;
  const otherDebtPayments = Math.max(0, monthlyDebtPayments - appData.expenses.loanPayments - appData.expenses.creditCards);
  const netWorth = appData.assets.totalAssets - appData.liabilities.totalLiabilities;

  const bankSummary = `Loan application preparation summary: Readiness ${approvalScore.band} (${approvalScore.score}/100). Total monthly income used: ${formatMoney(totalMonthlyIncome)}. Primary applicant income: ${formatMoney(appData.income.applicantIncome)}. Rental income: ${formatMoney(appData.income.rentalIncome)}. Investment income: ${formatMoney(appData.income.investmentIncome)}. Other recurring income: ${formatMoney(appData.income.otherIncome)}. Living expenses excluding housing/debt: ${formatMoney(nonHousingLivingExpenses)}. Housing payment: ${formatMoney(housingPayment)}. Debt payments: ${formatMoney(monthlyDebtPayments)}. Total monthly obligations: ${formatMoney(totalMonthlyObligations)}. Monthly surplus: ${formatMoney(monthlySurplus)}. DTI: ${formatRatio(debtToIncome)}. Housing ratio: ${formatRatio(housingRatio)}. Total monthly pressure: ${formatRatio(totalMonthlyPressure)}. Final approval is subject to lender underwriting.`;

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
        <p className="mt-1 text-xs">This score is an estimate only and does not represent a bank decision. Final approval is subject to lender underwriting.</p>
      </div>
      <DecisionBoundaryNotice context="loan" />

      <Section title="Financial Summary">
        <div className="md:col-span-2 rounded border border-blue-100 bg-blue-50 p-3 text-xs text-slate-700">
          Debt-to-Income is debt payments only divided by total monthly income. Housing Ratio is rent or mortgage only divided by total monthly income. Total Monthly Pressure is housing, living expenses, and debt payments divided by total monthly income.
        </div>
        <Row label="Total monthly income used" value={formatMoney(totalMonthlyIncome)} />
        <Row label="Primary applicant income" value={formatMoney(appData.income.applicantIncome)} />
        <Row label="Rental income" value={formatMoney(appData.income.rentalIncome)} />
        <Row label="Investment income" value={formatMoney(appData.income.investmentIncome)} />
        <Row label="Other recurring income" value={formatMoney(appData.income.otherIncome)} />
        <Row label="Living expenses, excluding housing and debt" value={formatMoney(nonHousingLivingExpenses)} />
        <Row label="Housing payment" value={formatMoney(housingPayment)} />
        <Row label="Monthly debt payments" value={formatMoney(monthlyDebtPayments)} />
        <Row label="Total monthly obligations" value={formatMoney(totalMonthlyObligations)} />
        <Row label="Monthly surplus / disposable income" value={formatMoney(monthlySurplus)} />
        <Row label="Debt-to-Income ratio" value={formatRatio(debtToIncome)} />
        <Row label="Housing ratio" value={formatRatio(housingRatio)} />
        <Row label="Total Monthly Pressure" value={formatRatio(totalMonthlyPressure)} />
        <Row label="Down payment %" value={downPaymentPercent === null ? "Not available" : formatPercent(downPaymentPercent * 100)} />
        <Row label="Savings runway" value={`${readinessProfile.financials.savingsRunwayMonths.toFixed(1)} months`} />
      </Section>

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
        <Row label="Co-applicant income" value={formatMoney(appData.income.coApplicantIncome)} />
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
        <Row label="Down payment %" value={downPaymentPercent === null ? "Not available" : formatPercent(downPaymentPercent * 100)} />
        <Row label="Loan-to-value" value={formatPercent((readinessProfile.loan.loanToValue ?? 0) * 100)} />
      </Section>

      <Section title="6. Statement of Affairs">
        <Subheading>A. Income</Subheading>
        <Row label="Primary applicant income" value={formatMoney(appData.income.applicantIncome)} />
        <Row label="Rental income" value={formatMoney(appData.income.rentalIncome)} />
        <Row label="Investment income" value={formatMoney(appData.income.investmentIncome)} />
        <Row label="Other recurring income" value={formatMoney(appData.income.otherIncome)} />
        <Row label="Co-applicant income placeholder" value={formatMoney(appData.income.coApplicantIncome)} />
        <Row label="Total monthly income" value={formatMoney(totalMonthlyIncome)} />

        <Subheading>B. Monthly Household Expenses</Subheading>
        <Row label="Housing payment" value={formatMoney(housingPayment)} />
        <Row label="Utilities" value={formatMoney(appData.expenses.utilities)} />
        <Row label="Transport" value={formatMoney(appData.expenses.transport)} />
        <Row label="Groceries / food" value={formatMoney(appData.expenses.food)} />
        <Row label="Insurance" value={formatMoney(appData.expenses.insurance)} />
        <Row label="Childcare" value={formatMoney(appData.expenses.childcare)} />
        <Row label="Discretionary" value={formatMoney(appData.expenses.discretionary)} />
        <Row label="Other living expenses" value={formatMoney(appData.expenses.other)} />
        <Row label="Total living expenses excluding housing and debt" value={formatMoney(nonHousingLivingExpenses)} />

        <Subheading>C. Debt Servicing</Subheading>
        <Row label="Loan payments" value={formatMoney(appData.expenses.loanPayments)} />
        <Row label="Credit card payments" value={formatMoney(appData.expenses.creditCards)} />
        <Row label="Other debt payments" value={formatMoney(otherDebtPayments)} />
        <Row label="Total monthly debt payments" value={formatMoney(monthlyDebtPayments)} />

        <Subheading>D. Totals</Subheading>
        <Row label="Total monthly obligations" value={formatMoney(totalMonthlyObligations)} />
        <Row label="Monthly surplus / disposable income" value={formatMoney(monthlySurplus)} />
        <Row label="Debt-to-Income ratio" value={formatRatio(debtToIncome)} />
        <Row label="Housing ratio" value={formatRatio(housingRatio)} />
        <Row label="Total Monthly Pressure" value={formatRatio(totalMonthlyPressure)} />

        <Subheading>E. Assets</Subheading>
        <Row label="Bank balances" value={formatMoney(appData.assets.bankBalances)} />
        <Row label="Cash savings" value={formatMoney(readinessProfile.financials.savingsCash)} />
        <Row label="Emergency fund" value={formatMoney(readinessProfile.financials.emergencyFund)} />
        <Row label="Down payment savings" value={formatMoney(appData.assets.downPaymentSavings)} />
        <Row label="Investments" value={formatMoney(readinessProfile.financials.investments)} />
        <Row label="Retirement savings" value={formatMoney(appData.assets.retirementSavings)} />
        <Row label="Real estate value" value={formatMoney(appData.assets.realEstate)} />
        <Row label="Other assets" value={formatMoney(Number(payload?.savingsProfile?.other_assets ?? 0))} />
        <Row label="Total assets" value={formatMoney(appData.assets.totalAssets)} />

        <Subheading>F. Liabilities</Subheading>
        <Row label="Mortgages" value={formatMoney(appData.liabilities.mortgages)} />
        <Row label="Loans" value={formatMoney(appData.liabilities.loans)} />
        <Row label="Credit cards" value={formatMoney(appData.liabilities.creditCards)} />
        <Row label="Other debts" value={formatMoney(appData.liabilities.otherDebts)} />
        <Row label="Total liabilities" value={formatMoney(appData.liabilities.totalLiabilities)} />
        <Row label="Net worth" value={formatMoney(netWorth)} />
      </Section>

      <Section title="7. Property Held">
        <Row label="Housing status" value={readinessProfile.housing.housingStatus} />
        <Row label="Estimated home value" value={formatMoney(readinessProfile.housing.estimatedHomeValue)} />
        <Row label="Mortgage balance" value={formatMoney(readinessProfile.housing.mortgageBalance)} />
        <Row label="Estimated equity" value={formatMoney(readinessProfile.housing.equity)} />
      </Section>

      <Section title="8. Documents Checklist">
        <div className="md:col-span-2 space-y-2 rounded border border-slate-300 bg-white p-3 text-black">
          {[
            ["Government-issued ID", payload?.profile?.has_id],
            ["Proof of address", payload?.profile?.has_proof_of_address],
            ["Employment letter", payload?.profile?.has_employment_letter],
            ["Payslips", payload?.profile?.has_payslips],
            ["3-6 months bank statements", payload?.profile?.has_bank_statements],
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

      <Section title="9. Declarations / Signature">
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
