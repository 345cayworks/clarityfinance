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
import { calculateRentRoomProfitability } from "@/lib/finance/rent-room";
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

type RentRoomScenario = {
  id: string;
  setup_json: Record<string, unknown>;
  income_json: Record<string, unknown>;
  costs_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  updated_at: string;
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
  { id: "rent-room", label: "Rent a Room Scenario Report" },
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
  const [rentRoomScenario, setRentRoomScenario] = useState<RentRoomScenario | null>(null);
  const [rentRoomLoading, setRentRoomLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const loadRentRoomScenario = async () => {
      if (activeReport !== "rent-room") return;
      setRentRoomLoading(true);
      try {
        const user = await getUser();
        if (!user) {
          if (!cancelled) {
            setRentRoomScenario(null);
            setRentRoomLoading(false);
          }
          return;
        }

        const token = await getIdentityToken(user);
        if (!token) {
          if (!cancelled) {
            setRentRoomScenario(null);
            setRentRoomLoading(false);
          }
          return;
        }

        const response = await fetch("/.netlify/functions/rent-room-get", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          if (!cancelled) {
            setRentRoomScenario(null);
            setRentRoomLoading(false);
          }
          return;
        }

        const payload = (await response.json()) as { scenario: RentRoomScenario | null };
        if (!cancelled) {
          setRentRoomScenario(payload.scenario ?? null);
          setRentRoomLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRentRoomScenario(null);
          setRentRoomLoading(false);
        }
      }
    };

    void loadRentRoomScenario();
    return () => {
      cancelled = true;
    };
  }, [activeReport]);

  const income = totalIncome(data?.incomeSources ?? []);
  const nonHousingExpenses = totalExpenses(data?.expenseProfile ?? null);
  const housing = housingPayment(data?.housingProfile ?? null);
  const totalExpenseWithHousing = nonHousingExpenses + housing;
  const expenses = totalExpenseWithHousing;
  const surplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null, data?.housingProfile ?? null);
  const debtPayments = monthlyDebtPayments(data?.debts ?? []);
  const totalMonthlyObligations = totalExpenseWithHousing + debtPayments;
  const totalDebtAmount = debtTotal(data?.debts ?? []);
  const dti = income > 0 ? debtPayments / income : null;
  const totalObligationsRatio = income > 0 ? totalMonthlyObligations / income : null;
  const adjustedSurplus = income - totalExpenseWithHousing - debtPayments;

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

  const currency = String(data?.profile?.preferred_currency ?? "USD") || "USD";

  const expenseRows = useMemo(() => {
    const categories = [
      { label: "Housing", value: housing },
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
      pct: totalExpenseWithHousing > 0 ? (row.value / totalExpenseWithHousing) * 100 : 0
    }));
  }, [data?.expenseProfile, totalExpenseWithHousing, housing]);

  const topExpenseRows = [...expenseRows].sort((a, b) => b.value - a.value).slice(0, 3);

  const rentRoomSetup = (rentRoomScenario?.setup_json ?? {}) as Record<string, unknown>;
  const rentRoomIncome = (rentRoomScenario?.income_json ?? {}) as Record<string, unknown>;
  const rentRoomCosts = (rentRoomScenario?.costs_json ?? {}) as Record<string, unknown>;
  const rentRoomCalculated = rentRoomScenario
    ? calculateRentRoomProfitability({
        setup: rentRoomSetup,
        income: rentRoomIncome,
        costs: rentRoomCosts
      })
    : null;
  const rentRoomResult = {
    ...(rentRoomCalculated ?? {}),
    ...((rentRoomScenario?.result_json ?? {}) as Record<string, unknown>)
  } as Record<string, unknown>;
  const rentRoomConstructionCost =
    toNumber(rentRoomSetup.basicRepairs) + toNumber(rentRoomSetup.painting) + toNumber(rentRoomSetup.electricalPlumbing);
  const rentRoomFurnishingsCost =
    toNumber(rentRoomSetup.beddingFurniture) +
    toNumber(rentRoomSetup.deskChairStorage) +
    toNumber(rentRoomSetup.miniFridgeMicrowave) +
    toNumber(rentRoomSetup.decorStaging);
  const rentRoomOtherSetupCost =
    toNumber(rentRoomSetup.otherSetupCost) +
    toNumber(rentRoomSetup.permitsLegalAdmin) +
    toNumber(rentRoomSetup.wifiUpgrade) +
    toNumber(rentRoomSetup.cleaningDeepClean) +
    toNumber(rentRoomSetup.bathroomPrep) +
    toNumber(rentRoomSetup.doorLockSecurity) +
    toNumber(rentRoomSetup.airConditioningFan);

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
  , currency)}, monthly expenses of ${toCurrency(expenses, currency)}, monthly debt payments of ${toCurrency(debtPayments, currency)}, estimated surplus of ${toCurrency(
    adjustedSurplus
  , currency)}, savings runway of ${runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}, and estimated property equity of ${
    homeValue > 0 ? toCurrency(equity, currency) : "Missing data"
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
  if (loadError) return <div className="card">
    <p className="text-sm text-amber-700">{loadError}</p>
    <Link href="/app/onboarding"
      className="mt-3 inline-flex rounded-lg bg-[#0A2540] px-4 py-2
                 text-sm font-semibold text-white">
      Complete your profile
    </Link>
  </div>;

  return (
    <div className="space-y-4 print:bg-white">
      <section className="card space-y-4 print:bg-white print:shadow-none">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Reports</h1>
          <p className="mt-2 text-sm text-slate-600">Select a report type to review your financial position from different angles.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {reportOptions.map((option) => {
            const active = activeReport === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveReport(option.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex-none ${
                  active
                    ? "bg-[#0A2540] text-white"
                    : "border border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="border-t border-slate-200 print:hidden" />
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
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(income, currency)}</span>
              <span className="text-sm text-slate-500">monthly income</span>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0A2540]">Financial Snapshot</h2>
              <ReportActions
                reportName="financial-snapshot"
                csvRows={[
                  ["Metric", "Value"],
                  ["Monthly Income", toCurrency(income, currency)],
                  ["Monthly Expenses", toCurrency(totalExpenseWithHousing, currency)],
                  ["Monthly Surplus", toCurrency(surplus, currency)],
                  ["Savings Runway", runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`]
                ]}
                summaryText={`Financial Snapshot: income ${toCurrency(income, currency)}, expenses ${toCurrency(totalExpenseWithHousing, currency)}, surplus ${toCurrency(
                  surplus
                , currency)}, savings runway ${runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}, debt ${toCurrency(totalDebtAmount, currency)}.`}
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
            <p className="mt-2 text-sm text-slate-600">Total monthly income: {toCurrency(income, currency)}</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.income} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Expense summary</h2>
            <p className="mt-2 text-sm text-slate-600">Total monthly expenses: {toCurrency(totalExpenseWithHousing, currency)}</p>
            <p className="mt-1 text-sm text-slate-600">Housing included: {toCurrency(housing, currency)}</p>
            <p className="mt-1 text-xs text-slate-500">Housing is sourced from mortgage or rent details.</p>
            <div className="mt-2">
              <StatusBadge status={snapshotStatus.expenses} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">Monthly surplus</h2>
            <p className="mt-2 text-sm text-slate-600">{toCurrency(surplus, currency)}</p>
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
            <p className="mt-2 text-sm text-slate-600">{toCurrency(totalDebtAmount, currency)}</p>
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
              csvRows={[
                ["Category", "Amount", "Percentage of Total Expenses"],
                ["Total monthly expenses", toCurrency(totalExpenseWithHousing, currency), "100.0%"],
                ["Housing included", toCurrency(housing, currency), totalExpenseWithHousing > 0 ? `${((housing / totalExpenseWithHousing) * 100).toFixed(1)}%` : "0.0%"],
                ...expenseRows.map((row) => [row.label, toCurrency(row.value, currency), `${row.pct.toFixed(1)}%`])
              ]}
              summaryText={`Expense Report: total monthly expenses ${toCurrency(totalExpenseWithHousing, currency)}. Housing included: ${toCurrency(housing, currency)}. Top categories: ${
                topExpenseRows.map((row) => row.label).join(", ") || "Missing data"
              }.`}
              copied={copiedReport === "expense"}
              onCopy={() => {
                setCopiedReport("expense");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(totalExpenseWithHousing, currency)}</span>
            <span className="text-sm text-slate-500">total monthly expenses</span>
          </div>
          <p className="text-sm text-slate-600">Housing is included in total expenses and is sourced from mortgage or rent details.</p>
          <p className="text-sm text-slate-600">Housing included: {toCurrency(housing, currency)}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {expenseRows.map((row) => (
              <div key={row.label === "Housing" ? "Housing (Mortgage / Rent)" : row.label} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-[#0A2540]">{row.label === "Housing" ? "Housing (Mortgage / Rent)" : row.label}</p>
                <p className="text-slate-600">{toCurrency(row.value, currency)}</p>
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
                ["Monthly income", toCurrency(income, currency)],
                ["Non-housing living expenses", toCurrency(nonHousingExpenses, currency)],
                ["Housing payment", toCurrency(housing, currency)],
                ["Debt payments", toCurrency(debtPayments, currency)],
                ["Total monthly obligations", toCurrency(totalMonthlyObligations, currency)],
                ["Debt-to-income ratio", dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`],
                ["Housing Ratio (rent/mortgage only)", housingRatio === null ? "Missing data" : `${(housingRatio * 100).toFixed(1)}%`],
                ["Debt-to-Income (debt payments only)", dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`],
                ["Total Monthly Pressure (living + housing + debt)", totalObligationsRatio === null ? "Missing data" : `${(totalObligationsRatio * 100).toFixed(1)}%`],
                ["Adjusted surplus", toCurrency(adjustedSurplus, currency)],
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
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-semibold text-[#0A2540]">{approvalScore?.score.toString() ?? "—"}</span>
            <span className="text-sm text-slate-500">{`/ 100 · ${approvalScore?.band ?? ""}`}</span>
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
                <p>Monthly income: {toCurrency(income, currency)}</p>
                <p>Income type: {String(data?.profile?.income_type ?? "Missing data")}</p>
                <p>Income frequency: {String(data?.profile?.income_frequency ?? "Missing data")}</p>
                <p>Income stability: {String(data?.profile?.income_stability ?? "Missing data")}</p>
                <p>Notes: salary/business/self-employed/rental/pension</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Expense Position</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Living expenses (excluding housing): {toCurrency(expenses, currency)}</p>
                <p>Housing payment: {toCurrency(housing, currency)}</p>
                <p>Debt payments: {toCurrency(debtPayments, currency)}</p>
                <p>Total monthly obligations: {toCurrency(expenses + housing + debtPayments, currency)}</p>
                {expenseRows.map((row) => (
                  <p key={row.label === "Housing" ? "Housing (Mortgage / Rent)" : row.label}>
                    {row.label === "Housing" ? "Housing (Mortgage / Rent)" : row.label}: {toCurrency(row.value, currency)}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Debt Obligations</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Total debt balance: {toCurrency(totalDebtAmount, currency)}</p>
                <p>Monthly debt payments: {toCurrency(debtPayments, currency)}</p>
                <p>Debt types: {debtTypes.join(", ") || "Missing data"}</p>
                <p>Interest rates: {(data?.debts?.length ?? 0) > 0 ? `${avgDebtRate.toFixed(2)}% avg` : "Missing data"}</p>
                <p>Debt-to-income ratio: {dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Housing / Property Position</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Housing status: {String(data?.housingProfile?.housing_status ?? "Missing data")}</p>
                <p>Rent amount: {toCurrency(toNumber(data?.housingProfile?.rent_amount), currency)}</p>
                <p>Mortgage balance: {mortgageBalance > 0 ? toCurrency(mortgageBalance, currency) : "Missing data"}</p>
                <p>Mortgage payment: {mortgagePayment > 0 ? toCurrency(mortgagePayment, currency) : "Missing data"}</p>
                <p>Housing payment used in ratios: {toCurrency(housing, currency)}</p>
                <p>Mortgage rate: {toNumber(data?.housingProfile?.mortgage_rate) > 0 ? `${toNumber(data?.housingProfile?.mortgage_rate)}%` : "Missing data"}</p>
                <p>Estimated home value: {homeValue > 0 ? toCurrency(homeValue, currency) : "Missing data"}</p>
                <p>Estimated equity: {homeValue > 0 ? toCurrency(equity, currency) : "Missing data"}</p>
                <p>Loan-to-value: {ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <h3 className="font-semibold text-[#0A2540]">Savings & Liquidity</h3>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Cash savings: {toCurrency(cashSavings, currency)}</p>
                <p>Emergency fund: {toCurrency(emergencyFund, currency)}</p>
                <p>Down payment savings: {toCurrency(downPaymentSavings, currency)}</p>
                <p>Investments: {toCurrency(toNumber(data?.savingsProfile?.investments), currency)}</p>
                <p>Retirement savings: {toCurrency(toNumber(data?.savingsProfile?.retirement_savings), currency)}</p>
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
                { label: "Monthly surplus (adjusted)", value: toCurrency(adjustedSurplus, currency), status: loanStatus.surplus },
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
            <h2 className="text-lg font-semibold text-[#0A2540]">Rent a Room Scenario Report</h2>
            {rentRoomScenario ? (
              <ReportActions
                reportName="rent-a-room-profitability"
                csvRows={[
                  ["Metric", "Value"],
                  ["Total setup cost", toCurrency(toNumber(rentRoomResult.totalSetupCost), currency)],
                  ["Construction/repair cost", toCurrency(rentRoomConstructionCost, currency)],
                  ["Furnishings cost", toCurrency(rentRoomFurnishingsCost, currency)],
                  ["Other setup costs", toCurrency(rentRoomOtherSetupCost, currency)],
                  ["Expected monthly rent", toCurrency(toNumber(rentRoomIncome.expectedMonthlyRent), currency)],
                  ["Occupancy %", `${toNumber(rentRoomIncome.occupancyPercent).toFixed(1)}%`],
                  ["Monthly added costs", toCurrency(toNumber(rentRoomResult.monthlyAddedCosts), currency)],
                  ["Net monthly profit", toCurrency(toNumber(rentRoomResult.netMonthlyProfit), currency)],
                  [
                    "Break-even timeline",
                    toNumber(rentRoomResult.breakEvenMonths) > 0 ? `${toNumber(rentRoomResult.breakEvenMonths).toFixed(1)} months` : "Not profitable"
                  ],
                  ["First-year net result", toCurrency(toNumber(rentRoomResult.firstYearNet), currency)],
                  ["Annual profit after break-even", toCurrency(toNumber(rentRoomResult.annualProfitAfterBreakEven), currency)],
                  ["Status label", String(rentRoomResult.statusLabel ?? "Missing data")]
                ]}
                summaryText={`Rent-a-Room report: setup ${toCurrency(toNumber(rentRoomResult.totalSetupCost), currency)}, expected monthly rent ${toCurrency(
                  toNumber(rentRoomIncome.expectedMonthlyRent)
                , currency)}, occupancy ${toNumber(rentRoomIncome.occupancyPercent).toFixed(1)}%, monthly added costs ${toCurrency(
                  toNumber(rentRoomResult.monthlyAddedCosts)
                , currency)}, net monthly profit ${toCurrency(toNumber(rentRoomResult.netMonthlyProfit), currency)}, break-even ${
                  toNumber(rentRoomResult.breakEvenMonths) > 0 ? `${toNumber(rentRoomResult.breakEvenMonths).toFixed(1)} months` : "not profitable"
                }, first-year net ${toCurrency(toNumber(rentRoomResult.firstYearNet), currency)}, annual after break-even ${toCurrency(
                  toNumber(rentRoomResult.annualProfitAfterBreakEven)
                , currency)}, status ${String(rentRoomResult.statusLabel ?? "Missing data")}.`}
                copied={copiedReport === "rent-room"}
                onCopy={() => {
                  setCopiedReport("rent-room");
                  window.setTimeout(() => setCopiedReport(null), 1500);
                }}
              />
            ) : null}
          </div>
          {rentRoomLoading ? (
            <p className="text-sm text-slate-600">Loading saved scenario…</p>
          ) : rentRoomScenario ? (
            <>
              <p className="text-sm text-slate-600">Total setup cost: {toCurrency(toNumber(rentRoomResult.totalSetupCost), currency)}</p>
              <p className="text-sm text-slate-600">Construction/repair cost: {toCurrency(rentRoomConstructionCost, currency)}</p>
              <p className="text-sm text-slate-600">Furnishings cost: {toCurrency(rentRoomFurnishingsCost, currency)}</p>
              <p className="text-sm text-slate-600">Other setup costs: {toCurrency(rentRoomOtherSetupCost, currency)}</p>
              <p className="text-sm text-slate-600">Expected monthly rent: {toCurrency(toNumber(rentRoomIncome.expectedMonthlyRent), currency)}</p>
              <p className="text-sm text-slate-600">Occupancy %: {toNumber(rentRoomIncome.occupancyPercent).toFixed(1)}%</p>
              <p className="text-sm text-slate-600">Monthly added costs: {toCurrency(toNumber(rentRoomResult.monthlyAddedCosts), currency)}</p>
              <p className="text-sm text-slate-600">Net monthly profit: {toCurrency(toNumber(rentRoomResult.netMonthlyProfit), currency)}</p>
              <p className="text-sm text-slate-600">
                Break-even timeline:{" "}
                {toNumber(rentRoomResult.breakEvenMonths) > 0
                  ? `${toNumber(rentRoomResult.breakEvenMonths).toFixed(1)} months`
                  : "Not profitable with current assumptions."}
              </p>
              <p className="text-sm text-slate-600">First-year net result: {toCurrency(toNumber(rentRoomResult.firstYearNet), currency)}</p>
              <p className="text-sm text-slate-600">Annual profit after break-even: {toCurrency(toNumber(rentRoomResult.annualProfitAfterBreakEven), currency)}</p>
              <p className="text-sm text-slate-600">Status label: {String(rentRoomResult.statusLabel ?? "Missing data")}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Use the Rent-a-Room Tool to create and save a scenario.</p>
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
                ["Monthly income", toCurrency(income, currency)],
                ["Non-housing living expenses", toCurrency(nonHousingExpenses, currency)],
                ["Housing payment", toCurrency(housing, currency)],
                ["Debt payments", toCurrency(debtPayments, currency)],
                ["Total monthly obligations", toCurrency(totalExpenseWithHousing + debtPayments, currency)],
                ["Monthly surplus", toCurrency(surplus, currency)],
                ["Savings balance", toCurrency(savingsBalance, currency)],
                ["Emergency fund", toCurrency(emergencyFund, currency)],
                ["Runway months", runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`]
              ]}
              summaryText={`Savings & Cash Flow: income ${toCurrency(income, currency)}, living expenses ${toCurrency(expenses, currency)}, housing payment ${toCurrency(
                housing
              , currency)}, debt payments ${toCurrency(debtPayments, currency)}, total obligations ${toCurrency(expenses + housing + debtPayments, currency)}, surplus ${toCurrency(
                surplus
              , currency)}, savings balance ${toCurrency(savingsBalance, currency)}, emergency fund ${toCurrency(emergencyFund, currency)}.`}
              copied={copiedReport === "savings"}
              onCopy={() => {
                setCopiedReport("savings");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-semibold text-[#0A2540]">{runwayMonths === null ? "—" : `${runwayMonths.toFixed(1)} mo`}</span>
            <span className="text-sm text-slate-500">savings runway</span>
          </div>
          <p className="text-sm text-slate-600">Monthly income: {toCurrency(income, currency)}</p>
          <p className="text-sm text-slate-600">Living expenses (excluding housing): {toCurrency(expenses, currency)}</p>
          <p className="text-sm text-slate-600">Housing payment: {toCurrency(housing, currency)}</p>
          <p className="text-sm text-slate-600">Debt payments: {toCurrency(debtPayments, currency)}</p>
          <p className="text-sm text-slate-600">Total monthly obligations: {toCurrency(expenses + housing + debtPayments, currency)}</p>
          <p className="text-sm text-slate-600">Monthly surplus: {toCurrency(surplus, currency)}</p>
          <p className="text-sm text-slate-600">Savings balance: {toCurrency(savingsBalance, currency)}</p>
          <p className="text-sm text-slate-600">Emergency fund: {toCurrency(emergencyFund, currency)}</p>
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
                ["Total debt", toCurrency(totalDebtAmount, currency)],
                ["Monthly debt payments", toCurrency(debtPayments, currency)],
                ["Debt-to-income ratio", dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`],
                ...(data?.debts ?? []).map((debt) => [String(debt.name ?? "Debt"), toCurrency(toNumber(debt.balance), currency)])
              ]}
              summaryText={`Debt report: total debt ${toCurrency(totalDebtAmount, currency)}, monthly debt payments ${toCurrency(
                debtPayments
              , currency)}, debt-to-income ratio ${dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`}.`}
              copied={copiedReport === "debt"}
              onCopy={() => {
                setCopiedReport("debt");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-semibold text-[#0A2540]">{toCurrency(totalDebtAmount, currency)}</span>
            <span className="text-sm text-slate-500">total debt</span>
          </div>
          <p className="text-sm text-slate-600">Total debt: {toCurrency(totalDebtAmount, currency)}</p>
          <p className="text-sm text-slate-600">Monthly debt payments: {toCurrency(debtPayments, currency)}</p>
          <p className="text-sm text-slate-600">Debt-to-income ratio: {dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {(data?.debts ?? []).map((debt, idx) => (
              <div key={`${String(debt.name ?? "debt")}-${idx}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-[#0A2540]">{String(debt.name ?? "Unnamed debt")}</p>
                <p className="text-slate-600">Type: {String(debt.type ?? "Unknown")}</p>
                <p className="text-slate-600">Balance: {toCurrency(toNumber(debt.balance), currency)}</p>
                <p className="text-slate-600">Monthly payment: {toCurrency(toNumber(debt.monthly_payment), currency)}</p>
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
                ["Home value", homeValue > 0 ? toCurrency(homeValue, currency) : "Missing data"],
                ["Mortgage balance", mortgageBalance > 0 ? toCurrency(mortgageBalance, currency) : "Missing data"],
                ["Equity", homeValue > 0 ? toCurrency(equity, currency) : "Missing data"],
                ["Mortgage payment", mortgagePayment > 0 ? toCurrency(mortgagePayment, currency) : "Missing data"],
                ["Estimated LTV", ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`]
              ]}
              summaryText={`Housing report: home value ${homeValue > 0 ? toCurrency(homeValue, currency) : "Missing data"}, mortgage balance ${
                mortgageBalance > 0 ? toCurrency(mortgageBalance, currency) : "Missing data"
              }, equity ${homeValue > 0 ? toCurrency(equity, currency) : "Missing data"}, LTV ${
                ltv === null ? "Missing data" : `${(ltv * 100).toFixed(1)}%`
              }.`}
              copied={copiedReport === "housing"}
              onCopy={() => {
                setCopiedReport("housing");
                window.setTimeout(() => setCopiedReport(null), 1500);
              }}
            />
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-semibold text-[#0A2540]">{homeValue > 0 ? toCurrency(equity, currency) : "—"}</span>
            <span className="text-sm text-slate-500">estimated equity</span>
          </div>
          <p className="text-sm text-slate-600">Home value: {homeValue > 0 ? toCurrency(homeValue, currency) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Mortgage balance: {mortgageBalance > 0 ? toCurrency(mortgageBalance, currency) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Equity: {homeValue > 0 ? toCurrency(equity, currency) : "Missing data"}</p>
          <p className="text-sm text-slate-600">Mortgage payment: {mortgagePayment > 0 ? toCurrency(mortgagePayment, currency) : "Missing data"}</p>
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
