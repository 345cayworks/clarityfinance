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

type DocumentItem = {
  group: string;
  label: string;
  value: unknown;
  optional?: boolean;
};

const toYesNoNotProvided = (value: unknown) => (value === true ? "Yes" : value === false ? "No" : "Not provided");
const formatRatio = (value: number | null | undefined) =>
  value === null || value === undefined ? "Missing income" : formatPercent(value * 100);
const textValue = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "Not provided";
};
const optionalMoney = (value: unknown) => {
  const amount = Number(value ?? 0);
  return amount > 0 ? formatMoney(amount) : "Not provided";
};

function Section({ title, children, breakBefore = false }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className={`print-avoid-break rounded-xl border border-slate-300 bg-white p-4 ${breakBefore ? "print:break-before-page" : ""}`}>
      <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-black">{title}</h2>
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-300 px-3 py-2 text-sm">
      <p className="text-xs uppercase text-slate-600">{label}</p>
      <p className="font-medium text-black">{String(value || "Not provided")}</p>
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="md:col-span-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
      <h3 className="md:col-span-2 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function NotesBox({ label }: { label: string }) {
  return (
    <div className="rounded border border-slate-300 px-3 py-3 text-sm">
      <p className="text-xs uppercase text-slate-600">{label}</p>
      <div className="mt-3 h-20 border-b border-slate-300" />
    </div>
  );
}

function StatusBadge({ value, optional = false }: { value: unknown; optional?: boolean }) {
  const provided = value === true;
  const missing = value === false;
  const label = provided ? "Provided" : missing ? "Missing" : optional ? "Not applicable" : "Not provided";
  const classes = provided
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : missing
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function DocumentGroup({ title, items }: { title: string; items: DocumentItem[] }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-b-0 last:pb-0">
            <span className="text-slate-700">{item.label}</span>
            <StatusBadge value={item.value} optional={item.optional} />
          </div>
        ))}
      </div>
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
  const loanToValue = readinessProfile.loan.loanToValue;
  const otherDebtPayments = Math.max(0, monthlyDebtPayments - appData.expenses.loanPayments - appData.expenses.creditCards);
  const otherAssets = Number(payload?.savingsProfile?.other_assets ?? 0);
  const netWorth = appData.assets.totalAssets - appData.liabilities.totalLiabilities;
  const documentGroups = ["Identity & Address", "Income & Employment", "Banking & Debt", "Property & Down Payment", "Self-Employed / Special Cases"];
  const documentItems: DocumentItem[] = [
    { group: "Identity & Address", label: "Government-issued ID", value: payload?.profile?.has_id },
    { group: "Identity & Address", label: "Proof of address", value: payload?.profile?.has_proof_of_address },
    { group: "Income & Employment", label: "Employment letter", value: payload?.profile?.has_employment_letter },
    { group: "Income & Employment", label: "Recent payslips", value: payload?.profile?.has_payslips },
    { group: "Banking & Debt", label: "3-6 months bank statements", value: payload?.profile?.has_bank_statements },
    { group: "Banking & Debt", label: "Existing loan/debt statements", value: payload?.profile?.has_debt_statements },
    { group: "Banking & Debt", label: "Credit report / credit profile", value: payload?.profile?.has_credit_report },
    { group: "Property & Down Payment", label: "Proof/source of down payment", value: payload?.profile?.has_down_payment_proof },
    { group: "Property & Down Payment", label: "Purchase agreement or property details", value: payload?.profile?.has_purchase_agreement },
    { group: "Property & Down Payment", label: "Property valuation/appraisal", value: payload?.profile?.has_valuation },
    { group: "Self-Employed / Special Cases", label: "Business registration and financials if self-employed", value: payload?.profile?.has_business_financials, optional: true },
    { group: "Self-Employed / Special Cases", label: "Tax returns if required", value: payload?.profile?.has_tax_returns, optional: true },
    { group: "Self-Employed / Special Cases", label: "Work permit if applicable", value: payload?.profile?.work_permit_required, optional: true }
  ];

  const bankSummary = `Loan application preparation summary: Readiness ${approvalScore.band} (${approvalScore.score}/100). Total monthly income used: ${formatMoney(totalMonthlyIncome)}. Total monthly obligations: ${formatMoney(totalMonthlyObligations)}. Monthly surplus: ${formatMoney(monthlySurplus)}. DTI: ${formatRatio(debtToIncome)}. Housing ratio: ${formatRatio(housingRatio)}. Total monthly pressure: ${formatRatio(totalMonthlyPressure)}. Down payment: ${formatMoney(readinessProfile.loan.downPaymentAvailable)}. LTV: ${loanToValue === null ? "Not available" : formatRatio(loanToValue)}. Final approval is subject to lender underwriting.`;

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
        <p className="mt-3 text-sm">
          Readiness band: <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${bandStyle(approvalScore.band)}`}>{approvalScore.band}</span>
          <span className="ml-2 font-semibold">Score: {formatNumber(approvalScore.score)}/100</span>
        </p>
        <p className="mt-2 text-xs">This is an estimate only and does not represent a bank decision. Final approval is subject to lender underwriting.</p>
      </div>

      <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Print / Save as PDF</button>
          <button onClick={async () => navigator.clipboard.writeText(bankSummary)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Copy Bank Summary</button>
          <button onClick={onExportPdf} className="rounded-lg border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90">Export Loan Application PDF</button>
          <button disabled className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400">Save Application Packet</button>
          <button disabled className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400">Request Advisor Review</button>
        </div>
      </div>

      <DecisionBoundaryNotice context="loan" />

      <Section title="1. Readiness Snapshot">
        <Row label="Total monthly income used" value={formatMoney(totalMonthlyIncome)} />
        <Row label="Total monthly obligations" value={formatMoney(totalMonthlyObligations)} />
        <Row label="Monthly surplus / disposable income" value={formatMoney(monthlySurplus)} />
        <Row label="Debt-to-Income ratio" value={formatRatio(debtToIncome)} />
        <Row label="Housing ratio" value={formatRatio(housingRatio)} />
        <Row label="Total Monthly Pressure" value={formatRatio(totalMonthlyPressure)} />
        <Row label="Down payment %" value={downPaymentPercent === null ? "Not available" : formatPercent(downPaymentPercent * 100)} />
        <Row label="Loan-to-value" value={loanToValue === null ? "Not available" : formatRatio(loanToValue)} />
        <Row label="Savings runway" value={`${readinessProfile.financials.savingsRunwayMonths.toFixed(1)} months`} />
      </Section>

      <Section title="2. Applicant & Contact Details">
        <Row label="Full name" value={textValue(readinessProfile.applicant.name)} />
        <Row label="Date of birth" value={textValue(readinessProfile.applicant.dateOfBirth)} />
        <Row label="Phone" value={textValue(readinessProfile.applicant.phone)} />
        <Row label="Email" value={textValue(readinessProfile.applicant.email)} />
        <Row label="Physical address" value={textValue(readinessProfile.applicant.physicalAddress)} />
        <Row label="Mailing address" value={textValue(readinessProfile.applicant.mailingAddress)} />
        <Row label="Nationality" value={textValue(readinessProfile.applicant.nationality)} />
        <Row label="Citizenship status" value={textValue(readinessProfile.applicant.citizenshipStatus)} />
        <Row label="Work permit required" value={toYesNoNotProvided(readinessProfile.applicant.workPermitRequired)} />
        <Row label="Work permit expiry date" value={textValue(readinessProfile.applicant.workPermitExpiryDate)} />
      </Section>

      <Section title="3. Co-applicant Details - Placeholder">
        <Row label="Co-applicant name" value="Not provided" />
        <Row label="Co-applicant contact" value="Not provided" />
        <Row label="Co-applicant income" value={formatMoney(appData.income.coApplicantIncome)} />
      </Section>

      <Section title="4. Employment & Income">
        <Row label="Employment type" value={textValue(readinessProfile.employment.employmentType)} />
        <Row label="Employer" value={textValue(readinessProfile.employment.employer)} />
        <Row label="Job title" value={textValue(readinessProfile.employment.jobTitle)} />
        <Row label="Employment length" value={textValue(readinessProfile.employment.employmentLength)} />
        <Row label="Income frequency" value={textValue(readinessProfile.employment.incomeFrequency)} />
        <Row label="Income stability" value={textValue(readinessProfile.employment.incomeStability)} />
        <Row label="Gross income" value={formatMoney(readinessProfile.financials.monthlyGrossIncome)} />
        <Row label="Net income" value={formatMoney(readinessProfile.financials.monthlyNetIncome)} />
        <Row label="Rental income" value={formatMoney(appData.income.rentalIncome)} />
        <Row label="Investment income" value={formatMoney(appData.income.investmentIncome)} />
        <Row label="Other recurring income" value={formatMoney(appData.income.otherIncome)} />
        <Row label="Total monthly income" value={formatMoney(totalMonthlyIncome)} />
      </Section>

      <Section title="5. Loan Request Details">
        <Row label="Loan purpose" value={textValue(readinessProfile.loan.loanPurpose)} />
        <Row label="Requested amount" value={formatMoney(readinessProfile.loan.requestedLoanAmount)} />
        <Row label="Purchase price" value={formatMoney(readinessProfile.loan.purchasePrice)} />
        <Row label="Down payment available" value={formatMoney(readinessProfile.loan.downPaymentAvailable)} />
        <Row label="Down payment %" value={downPaymentPercent === null ? "Not available" : formatPercent(downPaymentPercent * 100)} />
        <Row label="Loan-to-value" value={loanToValue === null ? "Not available" : formatRatio(loanToValue)} />
        <Row label="Desired loan term" value={readinessProfile.loan.desiredLoanTermYears > 0 ? `${readinessProfile.loan.desiredLoanTermYears} years` : "Not provided"} />
        <Row label="Property type" value={textValue(readinessProfile.loan.propertyType)} />
        <Row label="Property location" value={textValue(readinessProfile.loan.propertyLocation)} />
        <Row label="Property identified" value={toYesNoNotProvided(readinessProfile.loan.propertyIdentified)} />
        <Row label="Purchase agreement available" value={toYesNoNotProvided(readinessProfile.loan.purchaseAgreementAvailable)} />
      </Section>

      <Section title="6. Statement of Affairs" breakBefore>
        <Subsection title="A. Income Summary">
          <Row label="Primary applicant income" value={formatMoney(appData.income.applicantIncome)} />
          <Row label="Rental income" value={formatMoney(appData.income.rentalIncome)} />
          <Row label="Investment income" value={formatMoney(appData.income.investmentIncome)} />
          <Row label="Other recurring income" value={formatMoney(appData.income.otherIncome)} />
          <Row label="Co-applicant income placeholder" value={formatMoney(appData.income.coApplicantIncome)} />
          <Row label="Total monthly income" value={formatMoney(totalMonthlyIncome)} />
        </Subsection>

        <Subsection title="B. Household Expenses">
          <Row label="Housing payment" value={formatMoney(housingPayment)} />
          <Row label="Utilities" value={formatMoney(appData.expenses.utilities)} />
          <Row label="Transport" value={formatMoney(appData.expenses.transport)} />
          <Row label="Groceries / food" value={formatMoney(appData.expenses.food)} />
          <Row label="Insurance" value={formatMoney(appData.expenses.insurance)} />
          <Row label="Childcare" value={formatMoney(appData.expenses.childcare)} />
          <Row label="Discretionary" value={formatMoney(appData.expenses.discretionary)} />
          <Row label="Other living expenses" value={formatMoney(appData.expenses.other)} />
          <Row label="Living expenses excluding housing and debt" value={formatMoney(nonHousingLivingExpenses)} />
        </Subsection>

        <Subsection title="C. Debt Servicing">
          <Row label="Loan payments" value={formatMoney(appData.expenses.loanPayments)} />
          <Row label="Credit card payments" value={formatMoney(appData.expenses.creditCards)} />
          <Row label="Other debt payments" value={formatMoney(otherDebtPayments)} />
          <Row label="Total monthly debt payments" value={formatMoney(monthlyDebtPayments)} />
        </Subsection>

        <Subsection title="D. Monthly Position">
          <Row label="Total monthly obligations" value={formatMoney(totalMonthlyObligations)} />
          <Row label="Monthly surplus / disposable income" value={formatMoney(monthlySurplus)} />
          <Row label="Debt-to-Income ratio" value={formatRatio(debtToIncome)} />
          <Row label="Housing ratio" value={formatRatio(housingRatio)} />
          <Row label="Total Monthly Pressure" value={formatRatio(totalMonthlyPressure)} />
        </Subsection>
      </Section>

      <Section title="7. Assets, Liabilities & Net Worth" breakBefore>
        <Subsection title="Assets">
          <Row label="Bank balances" value={formatMoney(appData.assets.bankBalances)} />
          <Row label="Cash savings" value={formatMoney(readinessProfile.financials.savingsCash)} />
          <Row label="Emergency fund" value={formatMoney(readinessProfile.financials.emergencyFund)} />
          <Row label="Down payment savings" value={formatMoney(appData.assets.downPaymentSavings)} />
          <Row label="Investments" value={formatMoney(readinessProfile.financials.investments)} />
          <Row label="Retirement savings" value={formatMoney(appData.assets.retirementSavings)} />
          <Row label="Real estate value" value={formatMoney(appData.assets.realEstate)} />
          <Row label="Other assets" value={formatMoney(otherAssets)} />
          <Row label="Total assets" value={formatMoney(appData.assets.totalAssets)} />
        </Subsection>

        <Subsection title="Liabilities">
          <Row label="Mortgages" value={formatMoney(appData.liabilities.mortgages)} />
          <Row label="Loans" value={formatMoney(appData.liabilities.loans)} />
          <Row label="Credit cards" value={formatMoney(appData.liabilities.creditCards)} />
          <Row label="Other debts" value={formatMoney(appData.liabilities.otherDebts)} />
          <Row label="Total liabilities" value={formatMoney(appData.liabilities.totalLiabilities)} />
        </Subsection>

        <Subsection title="Net Worth">
          <Row label="Total assets" value={formatMoney(appData.assets.totalAssets)} />
          <Row label="Total liabilities" value={formatMoney(appData.liabilities.totalLiabilities)} />
          <Row label="Net worth" value={formatMoney(netWorth)} />
        </Subsection>
      </Section>

      <Section title="8. Property / Housing Details">
        <Row label="Housing status" value={textValue(readinessProfile.housing.housingStatus)} />
        <Row label="Rent amount" value={optionalMoney(readinessProfile.housing.rentAmount)} />
        <Row label="Mortgage payment" value={optionalMoney(readinessProfile.housing.mortgagePayment)} />
        <Row label="Estimated home value" value={formatMoney(readinessProfile.housing.estimatedHomeValue)} />
        <Row label="Mortgage balance" value={formatMoney(readinessProfile.housing.mortgageBalance)} />
        <Row label="Estimated equity" value={formatMoney(readinessProfile.housing.equity)} />
        <Row label="Estimated room rental income" value={optionalMoney(readinessProfile.housing.estimatedRoomRentalIncome)} />
      </Section>

      <Section title="9. Document Checklist" breakBefore>
        <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
          {documentGroups.map((group) => (
            <DocumentGroup key={group} title={group} items={documentItems.filter((item) => item.group === group)} />
          ))}
        </div>
      </Section>

      <Section title="10. Advisor / Bank Notes">
        <NotesBox label="Advisor notes" />
        <NotesBox label="Bank officer notes" />
        <NotesBox label="Follow-up items" />
      </Section>

      <Section title="11. Declaration & Signature">
        <div className="md:col-span-2 rounded border border-slate-300 px-3 py-3 text-sm text-slate-700">
          I confirm that the information in this preparation form is based on the details I provided and should be verified before submission to a lender.
        </div>
        <Row label="Applicant signature" value="______________________________" />
        <Row label="Date" value="______________________________" />
        <Row label="Co-applicant signature" value="______________________________" />
        <Row label="Date" value="______________________________" />
      </Section>

      <style jsx global>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .print\:hidden { display: none !important; }
          .print\:break-before-page { break-before: page; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
