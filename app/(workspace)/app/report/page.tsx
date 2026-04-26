"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import {
  debtTotal,
  housingEquity,
  monthlyDebtPayments,
  monthlySurplus,
  savingsRunwayMonths,
  toCurrency,
  toNumber,
  totalExpenses,
  totalIncome
} from "@/lib/finance/calculations";

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
  | "housing";

type Status = "Strong" | "Needs attention" | "Incomplete";

const reportOptions: Array<{ id: ReportId; label: string }> = [
  { id: "snapshot", label: "Financial Snapshot" },
  { id: "expense", label: "Expense Report" },
  { id: "loan", label: "Bank Loan Readiness Report" },
  { id: "rent-room", label: "Rent-a-Room Profitability Report" },
  { id: "savings", label: "Savings & Cash Flow Report" },
  { id: "debt", label: "Debt & Liability Report" },
  { id: "housing", label: "Housing & Equity Report" }
];

const badgeClass = (status: Status) => {
  if (status === "Strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Needs attention") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(status)}`}>{status}</span>
);

export default function ReportPage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportId>("snapshot");

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
  const surplus = monthlySurplus(data?.incomeSources ?? [], data?.expenseProfile ?? null);
  const debtPayments = monthlyDebtPayments(data?.debts ?? []);
  const totalDebtAmount = debtTotal(data?.debts ?? []);
  const dti = income > 0 ? debtPayments / income : null;

  const homeValue = toNumber(data?.housingProfile?.estimated_home_value);
  const mortgageBalance = toNumber(data?.housingProfile?.mortgage_balance);
  const mortgagePayment = toNumber(data?.housingProfile?.mortgage_payment);
  const housingPayment = mortgagePayment || toNumber(data?.housingProfile?.rent_amount);
  const housingRatio = income > 0 ? housingPayment / income : null;
  const ltv = homeValue > 0 ? mortgageBalance / homeValue : null;
  const equity = housingEquity(data?.housingProfile ?? null);

  const cashSavings = toNumber(data?.savingsProfile?.cash_savings);
  const emergencyFund = toNumber(data?.savingsProfile?.emergency_fund);
  const savingsBalance =
    cashSavings +
    emergencyFund +
    toNumber(data?.savingsProfile?.investments) +
    toNumber(data?.savingsProfile?.retirement_savings);
  const runwayMonths = savingsRunwayMonths(data?.savingsProfile ?? null, data?.expenseProfile ?? null);

  const expenseRows = useMemo(() => {
    const categories = [
      { label: "Housing", value: toNumber(data?.expenseProfile?.housing) },
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
    dti: dti === null ? "Incomplete" : dti <= 0.36 ? "Strong" : "Needs attention",
    housing: housingRatio === null ? "Incomplete" : housingRatio <= 0.3 ? "Strong" : "Needs attention",
    surplus: income <= 0 ? "Incomplete" : surplus >= 0 ? "Strong" : "Needs attention",
    runway: runwayMonths === null ? "Incomplete" : runwayMonths >= 3 ? "Strong" : "Needs attention",
    equity: homeValue <= 0 ? "Incomplete" : equity > 0 ? "Strong" : "Needs attention"
  } as Record<string, Status>;

  const snapshotStatus = {
    income: income > 0 ? "Strong" : "Incomplete",
    expenses: expenses > 0 ? "Strong" : "Incomplete",
    surplus: income <= 0 ? "Incomplete" : surplus >= 0 ? "Strong" : "Needs attention",
    runway: runwayMonths === null ? "Incomplete" : runwayMonths >= 3 ? "Strong" : "Needs attention",
    debt: totalDebtAmount <= 0 ? "Incomplete" : totalDebtAmount < income * 12 ? "Strong" : "Needs attention",
    goals: data?.goals?.target_goal ? "Strong" : "Incomplete"
  } as Record<string, Status>;

  if (loading) return <div className="card text-sm text-slate-600">Loading reports…</div>;
  if (loadError) return <div className="card text-sm text-amber-700">{loadError}</div>;

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Reports</h1>
          <p className="mt-2 text-sm text-slate-600">Select a report type to review your financial position from different angles.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="flex flex-wrap gap-2 text-sm">
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
        <section className="grid gap-3 md:grid-cols-2">
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
          <h2 className="text-lg font-semibold text-[#0A2540]">Expense Report</h2>
          <p className="text-sm text-slate-600">Total monthly expenses: {toCurrency(expenses)}</p>
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
          <h2 className="text-lg font-semibold text-[#0A2540]">Bank Loan Readiness Report</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { label: "Income", value: toCurrency(income), status: income > 0 ? "Strong" : "Incomplete" },
              { label: "Debt-to-income ratio", value: dti === null ? "Missing data" : `${(dti * 100).toFixed(1)}%`, status: loanStatus.dti },
              { label: "Housing payment ratio", value: housingRatio === null ? "Missing data" : `${(housingRatio * 100).toFixed(1)}%`, status: loanStatus.housing },
              { label: "Monthly surplus", value: toCurrency(surplus), status: loanStatus.surplus },
              { label: "Savings runway", value: runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`, status: loanStatus.runway },
              { label: "Equity", value: homeValue <= 0 ? "Missing data" : toCurrency(equity), status: loanStatus.equity }
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
        </section>
      ) : null}

      {activeReport === "rent-room" ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-[#0A2540]">Rent-a-Room Profitability Report</h2>
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
          <h2 className="text-lg font-semibold text-[#0A2540]">Savings & Cash Flow Report</h2>
          <p className="text-sm text-slate-600">Monthly income: {toCurrency(income)}</p>
          <p className="text-sm text-slate-600">Monthly expenses: {toCurrency(expenses)}</p>
          <p className="text-sm text-slate-600">Monthly surplus: {toCurrency(surplus)}</p>
          <p className="text-sm text-slate-600">Savings balance: {toCurrency(savingsBalance)}</p>
          <p className="text-sm text-slate-600">Emergency fund: {toCurrency(emergencyFund)}</p>
          <p className="text-sm text-slate-600">Runway months: {runwayMonths === null ? "Missing data" : `${runwayMonths.toFixed(1)} months`}</p>
        </section>
      ) : null}

      {activeReport === "debt" ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-[#0A2540]">Debt & Liability Report</h2>
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
          <h2 className="text-lg font-semibold text-[#0A2540]">Housing & Equity Report</h2>
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
