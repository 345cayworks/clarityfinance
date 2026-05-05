"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import {
  calculateDividendBasket,
  normalizeDividendSymbol,
  projectionYearOptions,
  type DividendPayoutFrequency,
  type DividendPositionInput
} from "@/lib/finance/dividend-reinvestment-calculator";

const frequencyOptions: Array<{ value: DividendPayoutFrequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" }
];

const allowedRoles = new Set(["premium_user", "advisor", "admin", "superadmin"]);

const newPosition = (): DividendPositionInput => ({
  id: crypto.randomUUID(),
  symbol: "",
  buyPrice: 0,
  quantity: 0,
  dividendYieldPercent: 0,
  payoutFrequency: "quarterly",
  reinvestDividends: true,
  projectionYears: 10
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

const formatPercent = (value: number) => `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
const formatShares = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(4);

function setNumber(value: string) {
  if (value.trim() === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getValidationErrors(positions: DividendPositionInput[]) {
  const errors: string[] = [];
  if (positions.length === 0) errors.push("Add at least one dividend position.");
  if (positions.length > 10) errors.push("The basket can include up to 10 positions.");

  positions.forEach((position, index) => {
    const label = position.symbol.trim() || `Position ${index + 1}`;
    if (!position.symbol.trim()) errors.push(`${label}: enter a stock, ETF, REIT, or fund name.`);
    if (!Number.isFinite(position.buyPrice) || position.buyPrice <= 0) errors.push(`${label}: buy price must be greater than 0.`);
    if (!Number.isFinite(position.quantity) || position.quantity <= 0) errors.push(`${label}: quantity must be greater than 0.`);
    if (!Number.isFinite(position.dividendYieldPercent) || position.dividendYieldPercent < 0) errors.push(`${label}: dividend yield cannot be negative.`);
    if (!position.payoutFrequency) errors.push(`${label}: select a payout frequency.`);
    if (!projectionYearOptions.includes(position.projectionYears as (typeof projectionYearOptions)[number])) {
      errors.push(`${label}: select a valid projection period.`);
    }
  });

  return errors;
}

function isCalculable(position: DividendPositionInput) {
  return (
    position.symbol.trim() &&
    Number.isFinite(position.buyPrice) &&
    position.buyPrice > 0 &&
    Number.isFinite(position.quantity) &&
    position.quantity > 0 &&
    Number.isFinite(position.dividendYieldPercent) &&
    position.dividendYieldPercent >= 0 &&
    Boolean(position.payoutFrequency) &&
    projectionYearOptions.includes(position.projectionYears as (typeof projectionYearOptions)[number])
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#0A2540]">{value}</p>
    </div>
  );
}

export default function DividendReinvestmentCalculatorPage() {
  const { accountStatus } = useWorkspaceUser();
  const canUseCalculator = allowedRoles.has(accountStatus?.role ?? "");
  const [positions, setPositions] = useState<DividendPositionInput[]>([
    {
      ...newPosition(),
      symbol: "SCHD",
      buyPrice: 75,
      quantity: 10,
      dividendYieldPercent: 3.5
    }
  ]);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  const validationErrors = useMemo(() => getValidationErrors(positions), [positions]);
  const calculablePositions = useMemo(
    () => positions.filter(isCalculable).map((position) => ({ ...position, symbol: normalizeDividendSymbol(position.symbol) })),
    [positions]
  );
  const basket = useMemo(() => calculateDividendBasket(calculablePositions), [calculablePositions]);

  const updatePosition = <K extends keyof DividendPositionInput>(id: string, key: K, value: DividendPositionInput[K]) => {
    setPositions((current) => current.map((position) => (position.id === id ? { ...position, [key]: value } : position)));
  };

  const addPosition = () => {
    setAddMessage(null);
    if (positions.length >= 10) {
      setAddMessage("The basket can include up to 10 positions.");
      return;
    }
    setPositions((current) => [...current, newPosition()]);
  };

  const removePosition = (id: string) => {
    setAddMessage(null);
    setPositions((current) => (current.length === 1 ? current : current.filter((position) => position.id !== id)));
  };

  if (!canUseCalculator) {
    return (
      <div className="space-y-4">
        <section className="card">
          <h1 className="text-2xl font-semibold text-[#0A2540]">Dividend Reinvestment Calculator</h1>
          <p className="mt-2 text-sm text-slate-600">
            Estimate dividend income, periodic payouts, and long-term compounding if dividends are reinvested.
          </p>
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This planning calculator is available to premium users, advisors, and admins.
          </p>
        </section>
      </div>
    );
  }

  const summary = basket.summary;
  const hasCalculations = calculablePositions.length > 0;

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Dividend Reinvestment Calculator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Estimate dividend income, periodic payouts, and long-term compounding if dividends are reinvested.
        </p>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Build Your Dividend Basket</h2>
            <p className="mt-1 text-sm text-slate-600">Enter up to 10 dividend stocks, ETFs, REITs, or income funds.</p>
          </div>
          <button
            type="button"
            onClick={addPosition}
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]"
          >
            Add Position
          </button>
        </div>

        {addMessage ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{addMessage}</p> : null}
        {validationErrors.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">Please review these inputs:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {validationErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="space-y-3">
          {positions.map((position, index) => (
            <div key={position.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#0A2540]">Position {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removePosition(position.id)}
                  disabled={positions.length === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove Position
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Stock/ETF name or ticker</span>
                  <input
                    value={position.symbol}
                    onChange={(event) => updatePosition(position.id, "symbol", event.target.value)}
                    onBlur={() => updatePosition(position.id, "symbol", normalizeDividendSymbol(position.symbol))}
                    placeholder="SCHD, O, JEPI, AAPL, etc."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Buy price per share</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={position.buyPrice}
                    onChange={(event) => updatePosition(position.id, "buyPrice", setNumber(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Quantity owned</span>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={position.quantity}
                    onChange={(event) => updatePosition(position.id, "quantity", setNumber(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Dividend yield %</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={position.dividendYieldPercent}
                    onChange={(event) => updatePosition(position.id, "dividendYieldPercent", setNumber(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Payout frequency</span>
                  <select
                    value={position.payoutFrequency}
                    onChange={(event) => updatePosition(position.id, "payoutFrequency", event.target.value as DividendPayoutFrequency)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {frequencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Projection period</span>
                  <select
                    value={position.projectionYears}
                    onChange={(event) => updatePosition(position.id, "projectionYears", Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {projectionYearOptions.map((years) => <option key={years} value={years}>{years} years</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={position.reinvestDividends}
                    onChange={(event) => updatePosition(position.id, "reinvestDividends", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Reinvest dividends</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-[#0A2540]">
          For MVP, reinvested dividends are assumed to buy additional shares at the entered buy price.
        </p>
      </section>

      <section className="space-y-3">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Dividend Income Summary</h2>
          <p className="mt-1 text-sm text-slate-600">Totals are based on the currently valid basket positions.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Starting Portfolio Value" value={formatCurrency(summary.startingPortfolioValue)} />
          <SummaryCard label="Current Annual Dividend Income" value={formatCurrency(summary.currentAnnualDividendIncome)} />
          <SummaryCard label="Current Monthly Equivalent Income" value={formatCurrency(summary.currentMonthlyEquivalentIncome)} />
          <SummaryCard label="Current Periodic Payout" value={formatCurrency(summary.currentPeriodicPayout)} />
          <SummaryCard label="Projected Portfolio Value" value={formatCurrency(summary.projectedPortfolioValue)} />
          <SummaryCard label="Projected Annual Dividend Income" value={formatCurrency(summary.projectedAnnualDividendIncome)} />
          <SummaryCard label="Cumulative Dividends" value={formatCurrency(summary.cumulativeDividends)} />
          <SummaryCard label="Total Growth From Reinvestment" value={formatCurrency(summary.totalGrowthFromReinvestment)} />
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Reinvestment Projection</h2>
          <p className="mt-1 text-sm text-slate-600">Basket-level projection by year.</p>
        </div>
        <div className="h-80">
          {hasCalculations ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={basket.projection} margin={{ top: 10, right: 18, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="year" tickFormatter={(value) => `Year ${value}`} />
                <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(value) => `Year ${value}`} />
                <Line type="monotone" dataKey="portfolioValue" name="Portfolio Value" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumulativeDividends" name="Cumulative Dividends" stroke="#14B8A6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="annualDividendIncome" name="Annual Dividend Income" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
              Enter a valid position to see the projection chart.
            </div>
          )}
        </div>
        {/* TODO: Connect Save Projection after a clean dividend projection persistence model exists. */}
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Position Breakdown</h2>
          <p className="mt-1 text-sm text-slate-600">Per-position payout and projection details.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Ticker/Name</th>
                <th className="py-2 pr-3">Buy Price</th>
                <th className="py-2 pr-3">Quantity</th>
                <th className="py-2 pr-3">Starting Value</th>
                <th className="py-2 pr-3">Dividend Yield</th>
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
              {basket.positions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-sm text-slate-500">No valid positions to calculate yet.</td>
                </tr>
              ) : null}
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
            <li>Share price remains constant unless future growth assumptions are added.</li>
            <li>Dividends are paid according to the selected payout frequency.</li>
            <li>Reinvested dividends buy fractional shares at the entered buy price.</li>
            <li>Taxes, fees, dividend cuts, and market price changes are not included.</li>
            <li>Results are for education and planning purposes only and are not investment advice.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Expected annual share price growth is not included in this MVP.
        </p>
      </section>
    </div>
  );
}
