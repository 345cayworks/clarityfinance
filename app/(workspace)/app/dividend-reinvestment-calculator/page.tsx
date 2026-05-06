"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";
import { PremiumLockedCard } from "@/components/premium-locked-card";
import {
  calculateDividendBasket,
  calculateDividendPosition,
  normalizeDividendSymbol,
  projectionPeriodOptions,
  validateDividendPosition,
  type DividendPayoutFrequency,
  type DividendPositionInput,
  type DividendPositionResult,
  type ProjectionInterval
} from "@/lib/finance/dividend-reinvestment-calculator";
import { canUsePremiumTools } from "@/lib/types/roles";

type ChartView = "portfolioValue" | "cumulativeDividends" | "annualDividendIncome" | "sharesOwned" | "all";

const frequencyOptions: Array<{ value: DividendPayoutFrequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" }
];

const chartViews: Array<{ value: ChartView; label: string }> = [
  { value: "portfolioValue", label: "Portfolio Value" },
  { value: "cumulativeDividends", label: "Cumulative Dividends" },
  { value: "annualDividendIncome", label: "Annual Dividend Income" },
  { value: "sharesOwned", label: "Shares Owned" },
  { value: "all", label: "All" }
];

const intervalOptions: Array<{ value: ProjectionInterval; label: string }> = [
  { value: "payout", label: "Payout Frequency Based" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
];

const emptyPosition = (): DividendPositionInput => ({
  id: crypto.randomUUID(),
  symbol: "",
  buyPrice: 0,
  quantity: 0,
  dividendYieldPercent: 0,
  payoutFrequency: "quarterly",
  reinvestDividends: true
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0);

const formatPercent = (value: number) => `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
const formatShares = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(4);

function setNumber(value: string) {
  if (value.trim() === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function SummaryCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#0A2540]">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

function ActionButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="print:hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block font-medium text-slate-700">{children}</span>;
}

export default function DividendReinvestmentCalculatorPage() {
  const { accountStatus } = useWorkspaceUser();
  const canUseCalculator = canUsePremiumTools(accountStatus?.role);
  const [formPosition, setFormPosition] = useState<DividendPositionInput>(emptyPosition);
  const [positions, setPositions] = useState<DividendPositionInput[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [chartView, setChartView] = useState<ChartView>("all");
  const [projectionInterval, setProjectionInterval] = useState<ProjectionInterval>("payout");

  const basket = useMemo(
    () => calculateDividendBasket(positions, projectionMonths, projectionInterval),
    [positions, projectionMonths, projectionInterval]
  );
  const hasHoldings = positions.length > 0;
  const resultsById = useMemo(() => new Map(basket.positions.map((position) => [position.id, position])), [basket.positions]);

  const updateForm = <K extends keyof DividendPositionInput>(key: K, value: DividendPositionInput[K]) => {
    setFormPosition((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormPosition(emptyPosition());
    setFormErrors([]);
  };

  const addToBasket = () => {
    const normalized = { ...formPosition, symbol: normalizeDividendSymbol(formPosition.symbol) };
    const duplicateCheck = positions.filter((position) => position.id !== editingId);
    const errors = validateDividendPosition(normalized, duplicateCheck);
    if (!editingId && positions.length >= 10) errors.push("The basket can include up to 10 positions.");

    setFormErrors(errors);
    if (errors.length > 0) return;

    if (editingId) {
      setPositions((current) => current.map((position) => (position.id === editingId ? normalized : position)));
    } else {
      setPositions((current) => [...current, normalized]);
    }
    resetForm();
  };

  const editPosition = (position: DividendPositionInput) => {
    setEditingId(position.id);
    setFormPosition(position);
    setFormErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removePosition = (id: string) => {
    setPositions((current) => current.filter((position) => position.id !== id));
    if (editingId === id) resetForm();
  };

  const printPage = () => window.print();
  const showLine = (key: ChartView) => chartView === "all" || chartView === key;
  const summary = basket.summary;

  if (!canUseCalculator) {
    return (
      <div className="space-y-4">
        <PremiumLockedCard featureName="Dividend Reinvestment Calculator" />
      </div>
    );
  }

  return (
    <div className="space-y-4 dividend-print-page">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Finance</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Dividend Reinvestment Calculator</h1>
        <p className="mt-2 text-sm text-slate-600">Estimate dividend income, periodic payouts, and long-term compounding if dividends are reinvested.</p>
      </section>
      <DecisionBoundaryNotice context="investment" />

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Add Dividend Position</h2>
          <p className="mt-1 text-sm text-slate-600">Add one holding at a time. The basket updates as each position is added.</p>
        </div>
        {formErrors.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">Please review:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {formErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm">
            <FieldLabel>Stock/ETF name or ticker</FieldLabel>
            <input
              value={formPosition.symbol}
              onChange={(event) => updateForm("symbol", event.target.value)}
              onBlur={() => updateForm("symbol", normalizeDividendSymbol(formPosition.symbol))}
              placeholder="SCHD, O, JEPI, AAPL, etc."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm">
            <FieldLabel>Buy price per share</FieldLabel>
            <input type="number" min="0" step="0.01" value={formPosition.buyPrice} onChange={(event) => updateForm("buyPrice", setNumber(event.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm">
            <FieldLabel>Quantity owned</FieldLabel>
            <input type="number" min="0" step="0.0001" value={formPosition.quantity} onChange={(event) => updateForm("quantity", setNumber(event.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm">
            <FieldLabel>Dividend yield %</FieldLabel>
            <input type="number" min="0" step="0.01" value={formPosition.dividendYieldPercent} onChange={(event) => updateForm("dividendYieldPercent", setNumber(event.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm">
            <FieldLabel>Payout frequency</FieldLabel>
            <select value={formPosition.payoutFrequency} onChange={(event) => updateForm("payoutFrequency", event.target.value as DividendPayoutFrequency)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              {frequencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={formPosition.reinvestDividends} onChange={(event) => updateForm("reinvestDividends", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span className="font-medium text-slate-700">Reinvest dividends</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 print:hidden">
          <button type="button" onClick={addToBasket} className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]">
            {editingId ? "Update Position" : "Add to Basket"}
          </button>
          {editingId ? <ActionButton onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Basket Holdings</h2>
            <p className="mt-1 text-sm text-slate-600">Each holding uses its own payout frequency and reinvestment setting.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{positions.length}/10 positions</span>
        </div>
        {!hasHoldings ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Add your first dividend holding to see your income and compounding projection.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {positions.map((position) => {
              const result = resultsById.get(position.id) ?? calculateDividendPosition(position, projectionMonths);
              return <PositionCard key={position.id} input={position} result={result} onEdit={() => editPosition(position)} onRemove={() => removePosition(position.id)} onPrint={printPage} />;
            })}
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Dividend Summary</h2>
            <p className="mt-1 text-sm text-slate-600">Basket-level income and yield metrics.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <ActionButton onClick={printPage} disabled={!hasHoldings}>Print Summary</ActionButton>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Starting Basket Value" value={formatCurrency(summary.startingPortfolioValue)} />
          <SummaryCard label="Annual Dividend Income" value={formatCurrency(summary.currentAnnualDividendIncome)} />
          <SummaryCard label="Basket Dividend Yield" value={formatPercent(summary.basketDividendYield)} note="Weighted by position value." />
          <SummaryCard label="Average Yield Across Holdings" value={formatPercent(summary.averageYieldAcrossHoldings)} note="Simple average, not portfolio yield." />
          <SummaryCard label="Monthly Equivalent Income" value={formatCurrency(summary.currentMonthlyEquivalentIncome)} />
          <SummaryCard label="Weekly Equivalent Income" value={formatCurrency(summary.currentWeeklyEquivalentIncome)} />
          <SummaryCard label="Highest Yield Holding" value={summary.highestYieldPosition ? `${summary.highestYieldPosition.symbol} ${formatPercent(summary.highestYieldPosition.yieldPercent)}` : "None"} />
          <SummaryCard label="Lowest Yield Holding" value={summary.lowestYieldPosition ? `${summary.lowestYieldPosition.symbol} ${formatPercent(summary.lowestYieldPosition.yieldPercent)}` : "None"} />
          <SummaryCard label="Weekly Payout Total" value={formatCurrency(summary.weeklyPayoutTotal)} />
          <SummaryCard label="Monthly Payout Total" value={formatCurrency(summary.monthlyPayoutTotal)} />
          <SummaryCard label="Quarterly Payout Total" value={formatCurrency(summary.quarterlyPayoutTotal)} />
          <SummaryCard label="Annual Payout Total" value={formatCurrency(summary.annualPayoutTotal)} />
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Reinvestment Projection</h2>
            <p className="mt-1 text-sm text-slate-600">Chart points follow each holding&apos;s payout schedule, with optional monthly or yearly aggregation.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <ActionButton onClick={printPage} disabled={!hasHoldings}>Print Projection</ActionButton>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 print:hidden">
          <label className="block text-sm">
            <FieldLabel>Projection period</FieldLabel>
            <select value={projectionMonths} onChange={(event) => setProjectionMonths(Number(event.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
              {projectionPeriodOptions.map((option) => <option key={option.months} value={option.months}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <FieldLabel>Chart View</FieldLabel>
            <select value={chartView} onChange={(event) => setChartView(event.target.value as ChartView)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
              {chartViews.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <FieldLabel>Projection Interval</FieldLabel>
            <select value={projectionInterval} onChange={(event) => setProjectionInterval(event.target.value as ProjectionInterval)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
              {intervalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Projected Portfolio Value" value={formatCurrency(summary.projectedPortfolioValue)} />
          <SummaryCard label="Projected Annual Dividend Income" value={formatCurrency(summary.projectedAnnualDividendIncome)} />
          <SummaryCard label="Cumulative Dividends" value={formatCurrency(summary.cumulativeDividends)} />
          <SummaryCard label="Total Growth From Reinvestment" value={formatCurrency(summary.totalGrowthFromReinvestment)} />
        </div>
        <div className="h-80">
          {hasHoldings ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={basket.projection} margin={{ top: 10, right: 18, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" minTickGap={24} />
                <YAxis tickFormatter={(value) => chartView === "sharesOwned" ? formatShares(Number(value)) : formatCompactCurrency(Number(value))} />
                <Tooltip formatter={(value, name) => name === "Shares Owned" ? formatShares(Number(value)) : formatCurrency(Number(value))} labelFormatter={(value) => String(value)} />
                {showLine("portfolioValue") ? <Line type="monotone" dataKey="portfolioValue" name="Portfolio Value" stroke="#2563EB" strokeWidth={2} dot={false} /> : null}
                {showLine("cumulativeDividends") ? <Line type="monotone" dataKey="cumulativeDividends" name="Cumulative Dividends" stroke="#14B8A6" strokeWidth={2} dot={false} /> : null}
                {showLine("annualDividendIncome") ? <Line type="monotone" dataKey="annualDividendIncome" name="Annual Dividend Income" stroke="#F59E0B" strokeWidth={2} dot={false} /> : null}
                {showLine("sharesOwned") ? <Line type="monotone" dataKey="sharesOwned" name="Shares Owned" stroke="#7C3AED" strokeWidth={2} dot={false} /> : null}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
              Add your first dividend holding to see your income and compounding projection.
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Full Breakdown</h2>
            <p className="mt-1 text-sm text-slate-600">Detailed payout and projection table.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <ActionButton onClick={printPage} disabled={!hasHoldings}>Print Full Report</ActionButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Ticker/Name</th>
                <th className="py-2 pr-3">Buy Price</th>
                <th className="py-2 pr-3">Quantity</th>
                <th className="py-2 pr-3">Starting Value</th>
                <th className="py-2 pr-3">Yield</th>
                <th className="py-2 pr-3">Payout Frequency</th>
                <th className="py-2 pr-3">Dividend/Share/Period</th>
                <th className="py-2 pr-3">Total/Period</th>
                <th className="py-2 pr-3">Annual Income</th>
                <th className="py-2 pr-3">Projected Shares</th>
                <th className="py-2 pr-3">Projected Value</th>
                <th className="py-2 pr-3">Projected Annual Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {basket.positions.map((position) => (
                <tr key={position.id} className="align-top">
                  <td className="py-3 pr-3 font-medium text-[#0A2540]">{position.symbol}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.buyPrice)}</td>
                  <td className="py-3 pr-3">{formatShares(position.quantity)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.startingValue)}</td>
                  <td className="py-3 pr-3">{formatPercent(position.dividendYieldPercent)}</td>
                  <td className="py-3 pr-3 capitalize">{position.payoutFrequency}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.dividendPerSharePerPeriod)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.totalDividendPerPeriod)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.annualDividendIncome)}</td>
                  <td className="py-3 pr-3">{formatShares(position.projectedShares)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.projectedValue)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.projectedAnnualDividendIncome)}</td>
                </tr>
              ))}
              {!hasHoldings ? <tr><td colSpan={12} className="py-6 text-center text-sm text-slate-500">Add a holding to calculate the breakdown.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold text-[#0A2540]">Assumptions</h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-[#0A2540]">Assumptions used in this calculator:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Dividend yield remains constant.</li>
            <li>Each holding uses the payout frequency selected by the user.</li>
            <li>Reinvested dividends buy fractional shares.</li>
            <li>Reinvested dividends are assumed to buy shares at the entered buy price.</li>
            <li>Share price remains constant unless a future growth assumption is added.</li>
            <li>Taxes, fees, dividend cuts, and market price changes are not included.</li>
            <li>Basket dividend yield is calculated as weighted annual dividend income divided by total basket value.</li>
            <li>Results are for education and planning purposes only and are not investment advice.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">TODO: Connect Save actions after a clean dividend_saved_cards persistence path exists.</p>
        <p className="text-xs text-slate-500">Generated: {new Date().toLocaleString()} · Report type: Dividend reinvestment projection · Version: Clarity Report v1.0 · Based on user-entered holdings and assumptions.</p>
      </section>
    </div>
  );
}

function PositionCard({
  input,
  result,
  onEdit,
  onRemove,
  onPrint
}: {
  input: DividendPositionInput;
  result: DividendPositionResult;
  onEdit: () => void;
  onRemove: () => void;
  onPrint: () => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#0A2540]">{result.symbol}</h3>
          <p className="text-sm text-slate-500 capitalize">{result.payoutFrequency} payout - {input.reinvestDividends ? "Reinvesting" : "Cash dividends"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={onEdit}>Edit</ActionButton>
          <ActionButton onClick={onRemove}>Remove</ActionButton>
          <ActionButton onClick={onPrint}>Print Position</ActionButton>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniMetric label="Buy price" value={formatCurrency(result.buyPrice)} />
        <MiniMetric label="Quantity" value={formatShares(result.quantity)} />
        <MiniMetric label="Dividend yield" value={formatPercent(result.dividendYieldPercent)} />
        <MiniMetric label="Position value" value={formatCurrency(result.startingValue)} />
        <MiniMetric label="Estimated payout per period" value={formatCurrency(result.totalDividendPerPeriod)} />
        <MiniMetric label="Annual dividend income" value={formatCurrency(result.annualDividendIncome)} />
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0A2540]">{value}</p>
    </div>
  );
}
