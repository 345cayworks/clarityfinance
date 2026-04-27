"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import { calculateApprovalReadinessScore } from "@/lib/finance/approval-score";
import {
  debtTotal,
  housingPayment,
  housingEquity,
  monthlyDebtPayments,
  monthlySurplus,
  savingsRunwayMonths,
  toCurrency,
  toNumber,
  totalExpenses,
  totalIncome
} from "@/lib/finance/calculations";
import { buildLoanReadinessProfile } from "@/lib/finance/loan-readiness-mapper";

type ProfileData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
};

type ReportId =
  | "snapshot"
  | "expense"
  | "loan"
  | "rent-room"
  | "savings"
  | "debt"
  | "housing"
  | "loan-docs";

type Status = "Strong" | "Needs attention" | "Incomplete" | "Review carefully" | "Missing data";

const reportOptions: Array<{ id: ReportId; label: string }> = [
  { id: "snapshot", label: "Financial Snapshot" },
  { id: "expense", label: "Expense Report" },
  { id: "loan", label: "Bank Loan Readiness Report" },
  { id: "loan-docs", label: "Loan Document Checklist" },
  { id: "rent-room", label: "Rent-a-Room Profitability Report" },
  { id: "savings", label: "Savings & Cash Flow Report" },
  { id: "debt", label: "Debt & Liability Report" },
  { id: "housing", label: "Housing & Equity Report" }
];

const badgeClass = (status: Status) => {
  if (status === "Strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Needs attention" || status === "Review carefully") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(status)}`}>{status}</span>
);

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const toStatus = (value: boolean | null): Status => {
  if (value === null) return "Missing data";
  return value ? "Strong" : "Review carefully";
};

function ReportActions({
  reportName,
  csvRows,
  summaryText,
  copied,
  onCopy
}: {
  reportName: string;
  csvRows: string[][];
  summaryText: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="print:hidden flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
        Print / Save as PDF
      </button>
      <button
        type="button"
        onClick={() => downloadCsv(`${reportName.toLowerCase().replace(/\s+/g, "-")}.csv`, csvRows)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(summaryText);
          onCopy();
        }}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
      >
        Copy Summary
      </button>
      {copied ? <span className="self-center text-xs font-medium text-emerald-700">Copied.</span> : null}
    </div>
  );
}

export default function ReportPage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportId>("snapshot");
  const [copiedReport, setCopiedReport] = useState<ReportId | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const token = await getIdentityToken(user);
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }

        const response = await fetch("/.netlify/functions/profile-get", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          if (!cancelled) {
            setLoadError("Unable to load profile data. Please update your profile.");
            setLoading(false);
          }
          return;
        }

        const result = (await response.json()) as ProfileData;
        if (!cancelled) {
          setData(result);
          setLoadError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load profile data. Please update your profile.");
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const income = totalIncome(data?.incomeSources ?? []);
  const expenses = totalExpenses(data?.expenseProfile ?? null);
  const housing = housingPayment(data?.housingProfile ?? null);
  const surplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null, data?.housingProfile ?? null);
  const debtPayments = monthlyDebtPayments(data?.debts ?? []);
  const totalDebtAmount = debtTotal(data?.debts ?? []);
  const dti = income > 0 ? debtPayments / income : null;
  const adjustedSurplus = income - expenses - housing - debtPayments;

  const homeValue = toNumber(data?.housingProfile?.estimated_home_value);
  const mortgageBalance = toNumber(data?.housingProfile?.mortgage_balance);
  const mortgagePayment = toNumber(data?.housingProfile?.mortgage_payment);
  const housingRatio = income > 0 ? housing / income : null;
  const ltv = homeValue > 0 ? mortgageBalance / homeValue : null;
  const equity = housingEquity(data?.housingProfile ?? null);

  const cashSavings = toNumber(data?.savingsProfile?.cash_savings);
  const emergencyFund = toNumber(data?.savingsProfile?.emergency_fund);
  const downPaymentSavings = toNumber(data?.savingsProfile?.down_payment_savings);
  const savingsBalance =
    cashSavings +
    emergencyFund +
    downPaymentSavings +
    toNumber(data?.savingsProfile?.investments) +
    toNumber(data?.savingsProfile?.retirement_savings);
  const runwayMonths = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null);
  const readinessProfile = useMemo(() => (data ? buildLoanReadinessProfile(data) : null), [data]);
  const approvalScore = useMemo(() => (readinessProfile ? calculateApprovalReadinessScore(readinessProfile) : null), [readinessProfile]);

  const expenseRows = useMemo(() => {
    const categories = [
      { label: "Utilities", value: toNumber(data?.expenseProfile?.utilities) },
      { label: "Transport", value: toNumber(data?.expenseProfile?.transport) },
      { label: "Groceries", value: toNumber(data?.expenseProfile?.groceries) },
      { label: "Insurance", value: toNumber(data?.expenseProfile?.insurance) },
      { label: "Childcare", value: toNumber(data?.expenseProfile?.childcare) },
      { label: "Discretionary", value: toNumber(data?.expenseProfile?.discretionary) },
      { label: "Other", value: toNumber(data?.expenseProfile?.other) }
    ];

    return categories.map((row) => ({
      ...row,
      pct: expenses > 0 ? (row.value / expenses) * 100 : 0
    }));
  }, [data?.expenseProfile, expenses]);

  const topExpenseRows = [...expenseRows].sort((a, b) => b.value - a.value).slice(0, 3);

  const rentEstimate = toNumber(data?.housingProfile?.estimated_room_rental_income);
  const rentReportHasData = rentEstimate > 0;
  const defaultSetup = 3000;
  const defaultMonthlyAddedCosts = 220;
  const rentMonthlyProfit = rentEstimate - defaultMonthlyAddedCosts;
  const rentBreakEven = rentMonthlyProfit > 0 ? defaultSetup / rentMonthlyProfit : null;

  const loanStatus = {
    dti: toStatus(dti === null ? null : dti <= 0.36),
    housing: toStatus(housingRatio === null ? null : housingRatio <= 0.3),
    surplus: toStatus(income <= 0 ? null : adjustedSurplus >= 0),
    runway: toStatus(runwayMonths === null ? null : runwayMonths >= 3),
    ltv: toStatus(ltv === null ? null : ltv <= 0.8)
  } as Record<string, Status>;

  const borrowerSnapshot = [
    ["Country/market", String(data?.profile?.country ?? "Missing data")],
    ["Preferred currency", String(data?.profile?.preferred_currency ?? "Missing data")],
    ["Employment type", String(data?.profile?.employment_type ?? "Missing data")],
    ["Household status", String(data?.profile?.household_status ?? "Missing data")],
    ["Dependents", String(data?.profile?.dependents ?? "Missing data")],
    ["Credit profile status", String(data?.profile?.credit_profile_status ?? "Missing data")]
  ];
  const debtTypes = (data?.debts ?? []).map((debt) => String(debt.type ?? "Unknown"));
  const avgDebtRate =
    (data?.debts ?? []).reduce((acc, debt) => acc + toNumber(debt.interest_rate), 0) / Math.max((data?.debts ?? []).length, 1);
  const bankChecklist = [
    "Government-issued ID",
    "Proof of address",
    "Employment letter",
    "Recent payslips",
    "3–6 months bank statements",
    "Existing loan/debt statements",
    "Credit report or credit profile",
    "Proof/source of down payment",
    "Purchase agreement or property details",
    "Property valuation/appraisal",
    "Insurance estimate",
    "Mortgage statement if refinancing",
    "Business registration and financials if self-employed",
    "Tax returns if required",
    "Rental income evidence if using rental income"
  ];
  const missingInfo = [
    income <= 0 ? "income" : null,
    data?.profile?.employment_type ? null : "employment type",
    expenses <= 0 ? "expenses" : null,
    debtPayments <= 0 ? "debt payment details" : null,
    data?.profile?.credit_profile_status ? null : "credit profile",
    downPaymentSavings > 0 ? null : "savings/down payment",
    homeValue > 0 ? null : "property value",
    mortgageBalance > 0 && mortgagePayment > 0 ? null : "mortgage balance/payment",
    "bank statements/documentation"
  ].filter(Boolean);

  const bankConversationSummary = `Based on the information provided, the applicant has monthly income of ${toCurrency(
    income
  )}, monthly expenses of ${toCurrency(expenses)}, monthly debt payments of ${toCurrency(debtPayments)}, estimated surplus of ${toCurrency(
    adjustedSurplus
  )}, savings runway of ${runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}, and estimated property equity of ${
    homeValue > 0 ? toCurrency(equity) : "Missing data"
  }. Items to confirm with the bank include: ${missingInfo.join(", ") || "none identified"}.`;

  const snapshotStatus: Record<"income" | "expenses" | "surplus" | "runway" | "debt" | "goals", Status> = {
    income: income > 0 ? "Strong" : "Incomplete",
    expenses: expenses > 0 ? "Strong" : "Incomplete",
    surplus: income <= 0 ? "Incomplete" : surplus >= 0 ? "Strong" : "Needs attention",
    runway: runwayMonths === null ? "Incomplete" : runwayMonths >= 3 ? "Strong" : "Needs attention",
    debt: totalDebtAmount <= 0 ? "Incomplete" : totalDebtAmount < income * 12 ? "Strong" : "Needs attention",
    goals: data?.goals?.target_goal ? "Strong" : "Incomplete"
  };

  if (loading) return <div className="card text-sm text-slate-600">Loading reports…</div>;
  if (loadError) return <div className="card text-sm text-amber-700">{loadError}</div>;

  return (
    <div className="space-y-4 print:bg-white">
      <section className="card space-y-4 print:bg-white print:shadow-none">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Reports</h1>
          <p className="mt-2 text-sm text-slate-600">Select a report type to review your financial position from different angles.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:hidden">
          {reportOptions.map((option) => {
            const active = activeReport === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveReport(option.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  active ? "border-blue-300 bg-blue-50 text-[#0A2540]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="print:hidden flex flex-wrap gap-2 text-sm">
          <Link href="/app/tools/rent-a-room" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:border-slate-400">
            Rent-a-Room Report →
          </Link>
          <Link href="/app/tools/mortgage" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:border-slate-400">
            Mortgage/Housing →
          </Link>
          <Link href="/app/tools/refinance" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:border-slate-400">
            Cash-out refinance →
          </Link>
        </div>
      </section>

      {activeReport === "snapshot" ? (
        <section className="grid gap-3 md:grid-cols-2 print:bg-white">
          <div className="card md:col-span-2 print:bg-white print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0A2540]">Financial Snapshot</h2>
              <ReportActions
                reportName="financial-snapshot"
                csvRows={[
                  ["Metric", "Value"],
                  ["Monthly Income", toCurrency(income)],
                  ["Monthly Expenses", toCurrency(expenses)],
                  ["Monthly Surplus", toCurrency(surplus)],
                  ["Savings Runway", runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`]
                ]}
                summaryText={`Financial Snapshot: income ${toCurrency(income)}, expenses ${toCurrency(expenses)}, surplus ${toCurrency(
                  surplus
                )}, savings runway ${runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}, debt ${toCurrency(totalDebtAmount)}.`}
                copied={copiedReport === "snapshot"}
                onCopy={() => {
                  setCopiedReport("snapshot");
                  window.setTimeout(() => setCopiedReport(null), 1500);
                }}
              />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Income summary</h2>
            <p className="mt-2 text-sm text-slate-600">Total monthly income: {toCurrency(income)}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.income} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Expense summary</h2>
            <p className="mt-2 text-sm text-slate-600">Total monthly expenses: {toCurrency(expenses)}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.expenses} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Monthly surplus</h2>
            <p className="mt-2 text-sm text-slate-600">{toCurrency(surplus)}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.surplus} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Savings runway</h2>
            <p className="mt-2 text-sm text-slate-600">{runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.runway} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Debt total</h2>
            <p className="mt-2 text-sm text-slate-600">{toCurrency(totalDebtAmount)}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.debt} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Goal summary</h2>
            <p className="mt-2 text-sm text-slate-600">{String(data?.goals?.target_goal ?? "Missing data")}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.goals} />
            </div>
          </div>
        </section>
      ) : null}

      {activeReport === "expense" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Expense Report</h2>
            <ReportActions
              reportName="expense-report"
              csvRows={[["Metric", "Value"], ...expenseRows.map((row) => [row.label, `${toCurrency(row.value)} (${row.pct.toFixed(1)}%)`])]}
              summaryText={`Expense Report: total monthly expenses ${toCurrency(expenses)}. Top categories: ${
                topExpenseRows.map((row) => row.label).join(", ") || "Missing data"
              }.`}
              copied={copiedReport === "expense"}
              onCopy={() => {
                setCopiedReport("expense");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <p className="text-sm text-slate-600">Total living expenses (excluding housing): {toCurrency(expenses)}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {expenseRows.map((row) => (
              <div key={row.label} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-[#0A2540]">{row.label}</p>
                <p className="text-slate-600">{toCurrency(row.value)}</p>
                <p className="text-xs text-slate-500">{row.pct.toFixed(1)}% of total</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#0A2540]">
            Top 3 expense categories: {topExpenseRows.map((row) => row.label).join(", ") || "Missing data"}
          </div>
        </section>
      ) : null}

      {activeReport === "loan" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Bank Loan Readiness Report</h2>
            <ReportActions
              reportName="bank-loan-readiness"
              csvRows={[
                ["Metric", "Value"],
                ...borrowerSnapshot,
                ["Monthly income", toCurrency(income)],
                ["Living expenses (excluding housing)", toCurrency(expenses)],
                ["Housing payment", toCurrency(housing)],
                ["Debt payments", toCurrency(debtPayments)],
                ["Total monthly obligations", toCurrency(expenses + housing + debtPayments)],
                ["Debt-to-income ratio", dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`],
                ["Housing ratio", housingRatio === null ? "Missing data" : `${(housingRatio * 100).toFixed(1)}%`],
                ["Adjusted surplus", toCurrency(adjustedSurplus)],
                ["Savings runway", runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`]
              ]}
              summaryText={bankConversationSummary}
              copied={copiedReport === "loan"}
              onCopy={() => {
                setCopiedReport("loan");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {approvalScore ? (
              <div className="rounded-lg border border-slate-200 p-3 text-sm md:col-span-2">
                <h3 className="font-semibold text-[#0A2540]">Approval Readiness Score</h3>
                <p className="mt-2 text-slate-600">
                  {approvalScore.band} ({approvalScore.score}/100)
                </p>
                <p className="mt-1 text-xs text-slate-500">This score is an estimate only and does not represent a bank decision.</p>
              </div>
            ) : null}
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Borrower Snapshot</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                {borrowerSnapshot.map(([key, value]) => (
                  <p key={key}>
                    {key}: {value}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Income & Employment</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Monthly income: {toCurrency(income)}</p>
                <p>Income type: {String(data?.profile?.income_type ?? "Missing data")}</p>
                <p>Income frequency: {String(data?.profile?.income_frequency ?? "Missing data")}</p>
                <p>Income stability: {String(data?.profile?.income_stability ?? "Missing data")}</p>
                <p>Notes: salary/business/self-employed/rental/pension</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Expense Position</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Living expenses (excluding housing): {toCurrency(expenses)}</p>
                <p>Housing payment: {toCurrency(housing)}</p>
                <p>Debt payments: {toCurrency(debtPayments)}</p>
                <p>Total monthly obligations: {toCurrency(expenses + housing + debtPayments)}</p>
                {expenseRows.map((row) => (
                  <p key={row.label}>
                    {row.label}: {toCurrency(row.value)}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Debt Obligations</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Total debt balance: {toCurrency(totalDebtAmount)}</p>
                <p>Monthly debt payments: {toCurrency(debtPayments)}</p>
                <p>Debt types: {debtTypes.join(", ") || "Missing data"}</p>
                <p>Interest rates: {(data?.debts?.length ?? 0) > 0 ? `${avgDebtRate.toFixed(2)}% avg` : "Missing data"}</p>
                <p>Debt-to-income ratio: {dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Housing / Property Position</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Housing status: {String(data?.housingProfile?.housing_status ?? "Missing data")}</p>
                <p>Rent amount: {toCurrency(toNumber(data?.housingProfile?.rent_amount))}</p>
                <p>Mortgage balance: {mortgageBalance > 0 ? toCurrency(mortgageBalance) : "Missing data"}</p>
                <p>Mortgage payment: {mortgagePayment > 0 ? toCurrency(mortgagePayment) : "Missing data"}</p>
                <p>Housing payment used in ratios: {toCurrency(housing)}</p>
                <p>Mortgage rate: {toNumber(data?.housingProfile?.mortgage_rate) > 0 ? `${toNumber(data?.housingProfile?.mortgage_rate)}%` : "Missing data"}</p>
                <p>Estimated home value: {homeValue > 0 ? toCurrency(homeValue) : "Missing data"}</p>
                <p>Estimated equity: {homeValue > 0 ? toCurrency(equity) : "Missing data"}</p>
                <p>Loan-to-value: {ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Savings & Liquidity</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Cash savings: {toCurrency(cashSavings)}</p>
                <p>Emergency fund: {toCurrency(emergencyFund)}</p>
                <p>Down payment savings: {toCurrency(downPaymentSavings)}</p>
                <p>Investments: {toCurrency(toNumber(data?.savingsProfile?.investments))}</p>
                <p>Retirement savings: {toCurrency(toNumber(data?.savingsProfile?.retirement_savings))}</p>
                <p>Savings runway: {runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <h3 className="font-semibold text-[#0A2540]">Loan Readiness Ratios</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {[
                { label: "Debt-to-income ratio", value: dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`, status: loanStatus.dti },
                { label: "Housing payment ratio", value: housingRatio === null ? "Missing data" : `${(housingRatio * 100).toFixed(1)}%`, status: loanStatus.housing },
                { label: "Monthly surplus (adjusted)", value: toCurrency(adjustedSurplus), status: loanStatus.surplus },
                { label: "Savings runway", value: runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`, status: loanStatus.runway },
                { label: "Loan-to-value", value: ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`, status: loanStatus.ltv }
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-[#0A2540]">{item.label}</p>
                  <p className="text-slate-600">{item.value}</p>
                  <div className="mt-2">
                    <StatusBadge status={item.status as Status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <h3 className="font-semibold text-[#0A2540]">Documents to Prepare for Bank</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
              {bankChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <h3 className="font-semibold text-[#0A2540]">Gaps / Missing Information</h3>
            <p className="mt-2 text-slate-600">{missingInfo.length > 0 ? missingInfo.join(", ") : "No major gaps detected."}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 print:bg-white">
            <h3 className="font-semibold text-[#0A2540]">Bank Conversation Summary</h3>
            <p className="mt-2">{bankConversationSummary}</p>
          </div>
        </section>
      ) : null}

      {activeReport === "loan-docs" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Loan Document Checklist</h2>
            <ReportActions
              reportName="loan-document-checklist"
              csvRows={[["Section", "Document"], ...bankChecklist.map((item) => ["Checklist", item])]}
              summaryText={`Loan Document Checklist: ${bankChecklist.join(", ")}.`}
              copied={copiedReport === "loan-docs"}
              onCopy={() => {
                setCopiedReport("loan-docs");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Identity documents</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                <li>Government-issued ID</li>
                <li>Proof of address</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Income documents</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                <li>Employment letter</li>
                <li>Recent payslips</li>
                <li>Tax returns if required</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Bank/account documents</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                <li>3–6 months bank statements</li>
                <li>Proof/source of down payment</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Debt documents</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                <li>Existing loan/debt statements</li>
                <li>Credit report or credit profile</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Property documents</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                <li>Purchase agreement or property details</li>
                <li>Property valuation/appraisal</li>
                <li>Insurance estimate</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Self-employed/business documents</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                <li>Business registration and financials</li>
                <li>Rental income evidence if using rental income</li>
                <li>Mortgage statement if refinancing / cash-out refinance</li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {activeReport === "rent-room" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Rent-a-Room Profitability Report</h2>
            <ReportActions
              reportName="rent-a-room-profitability"
              csvRows={[
                ["Metric", "Value"],
                ["Estimated setup cost", toCurrency(defaultSetup)],
                ["Estimated rent", toCurrency(rentEstimate)],
                ["Monthly profit", toCurrency(rentMonthlyProfit)],
                ["Break-even timeline", rentBreakEven === null ? "Not profitable" : `${rentBreakEven.toFixed(1)} months`]
              ]}
              summaryText={`Rent-a-Room report: setup ${toCurrency(defaultSetup)}, rent estimate ${toCurrency(
                rentEstimate
              )}, monthly profit ${toCurrency(rentMonthlyProfit)}, break-even ${
                rentBreakEven === null ? "not profitable" : `${rentBreakEven.toFixed(1)} months`
              }.`}
              copied={copiedReport === "rent-room"}
              onCopy={() => {
                setCopiedReport("rent-room");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          {rentReportHasData ? (
            <>
              <p className="text-sm text-slate-600">Estimated setup cost: {toCurrency(defaultSetup)} (placeholder guidance)</p>
              <p className="text-sm text-slate-600">Estimated rent: {toCurrency(rentEstimate)}</p>
              <p className="text-sm text-slate-600">Monthly profit: {toCurrency(rentMonthlyProfit)}</p>
              <p className="text-sm text-slate-600">
                Break-even timeline: {rentBreakEven === null ? "Not profitable with current assumptions." : `${rentBreakEven.toFixed(1)} months`}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Use Rent-a-Room Tool to generate this report.</p>
          )}
          <Link href="/app/tools/rent-a-room" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
            Open Rent-a-Room Tool
          </Link>
        </section>
      ) : null}

      {activeReport === "savings" ? (
        <section className="card space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Savings & Cash Flow Report</h2>
            <ReportActions
              reportName="savings-cash-flow"
              csvRows={[
                ["Metric", "Value"],
                ["Monthly income", toCurrency(income)],
                ["Living expenses (excluding housing)", toCurrency(expenses)],
                ["Housing payment", toCurrency(housing)],
                ["Debt payments", toCurrency(debtPayments)],
                ["Total monthly obligations", toCurrency(expenses + housing + debtPayments)],
                ["Monthly surplus", toCurrency(surplus)],
                ["Savings balance", toCurrency(savingsBalance)],
                ["Emergency fund", toCurrency(emergencyFund)],
                ["Runway months", runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`]
              ]}
              summaryText={`Savings & Cash Flow: income ${toCurrency(income)}, living expenses ${toCurrency(expenses)}, housing payment ${toCurrency(
                housing
              )}, debt payments ${toCurrency(debtPayments)}, total obligations ${toCurrency(expenses + housing + debtPayments)}, surplus ${toCurrency(
                surplus
              )}, savings balance ${toCurrency(savingsBalance)}, emergency fund ${toCurrency(emergencyFund)}.`}
              copied={copiedReport === "savings"}
              onCopy={() => {
                setCopiedReport("savings");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <p className="text-sm text-slate-600">Monthly income: {toCurrency(income)}</p>
          <p className="text-sm text-slate-600">Living expenses (excluding housing): {toCurrency(expenses)}</p>
          <p className="text-sm text-slate-600">Housing payment: {toCurrency(housing)}</p>
          <p className="text-sm text-slate-600">Debt payments: {toCurrency(debtPayments)}</p>
          <p className="text-sm text-slate-600">Total monthly obligations: {toCurrency(expenses + housing + debtPayments)}</p>
          <p className="text-sm text-slate-600">Monthly surplus: {toCurrency(surplus)}</p>
          <p className="text-sm text-slate-600">Savings balance: {toCurrency(savingsBalance)}</p>
          <p className="text-sm text-slate-600">Emergency fund: {toCurrency(emergencyFund)}</p>
          <p className="text-sm text-slate-600">Runway months: {runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}</p>
        </section>
      ) : null}

      {activeReport === "debt" ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Debt & Liability Report</h2>
            <ReportActions
              reportName="debt-liability"
              csvRows={[
                ["Metric", "Value"],
                ["Total debt", toCurrency(totalDebtAmount)],
                ["Monthly debt payments", toCurrency(debtPayments)],
                ["Debt-to-income ratio", dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`],
                ...(data?.debts ?? []).map((debt) => [String(debt.name ?? "Debt"), toCurrency(toNumber(debt.balance))])
              ]}
              summaryText={`Debt report: total debt ${toCurrency(totalDebtAmount)}, monthly debt payments ${toCurrency(
                debtPayments
              )}, debt-to-income ratio ${dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`}.`}
              copied={copiedReport === "debt"}
              onCopy={() => {
                setCopiedReport("debt");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <p className="text-sm text-slate-600">Total debt: {toCurrency(totalDebtAmount)}</p>
          <p className="text-sm text-slate-600">Monthly debt payments: {toCurrency(debtPayments)}</p>
          <p className="text-sm text-slate-600">Debt-to-income ratio: {dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {(data?.debts ?? []).map((debt, idx) => (
              <div key={`${String(debt.name ?? "debt")}-${idx}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-[#0A2540]">{String(debt.name ?? "Unnamed debt")}</p>
                <p className="text-slate-600">Type: {String(debt.type ?? "Unknown")}</p>
                <p className="text-slate-600">Balance: {toCurrency(toNumber(debt.balance))}</p>
                <p className="text-slate-600">Monthly payment: {toCurrency(toNumber(debt.monthly_payment))}</p>
              </div>
            ))}
          </div>
          {(data?.debts?.length ?? 0) === 0 ? <p className="text-sm text-slate-600">Missing data</p> : null}
        </section>
      ) : null}

      {activeReport === "housing" ? (
        <section className="card space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Housing & Equity Report</h2>
            <ReportActions
              reportName="housing-equity"
              csvRows={[
                ["Metric", "Value"],
                ["Home value", homeValue > 0 ? toCurrency(homeValue) : "Missing data"],
                ["Mortgage balance", mortgageBalance > 0 ? toCurrency(mortgageBalance) : "Missing data"],
                ["Equity", homeValue > 0 ? toCurrency(equity) : "Missing data"],
                ["Mortgage payment", mortgagePayment > 0 ? toCurrency(mortgagePayment) : "Missing data"],
                ["Estimated LTV", ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`]
              ]}
              summaryText={`Housing report: home value ${homeValue > 0 ? toCurrency(homeValue) : "Missing data"}, mortgage balance ${
                mortgageBalance > 0 ? toCurrency(mortgageBalance) : "Missing data"
              }, equity ${homeValue > 0 ? toCurrency(equity) : "Missing data"}, LTV ${
                ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`
              }.`}
              copied={copiedReport === "housing"}
              onCopy={() => {
                setCopiedReport("housing");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <p className="text-sm text-slate-600">Home value: {homeValue > 0 ? toCurrency(homeValue) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Mortgage balance: {mortgageBalance > 0 ? toCurrency(mortgageBalance) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Equity: {homeValue > 0 ? toCurrency(equity) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Mortgage payment: {mortgagePayment > 0 ? toCurrency(mortgagePayment) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Estimated LTV: {ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/app/tools/mortgage" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
              Open Mortgage Tool
            </Link>
            <Link href="/app/tools/refinance" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
              Open Cash-Out Refinance Tool
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
