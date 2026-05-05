"use client";

import { useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import type { InvestmentAnalysisResponse } from "@/lib/market-data/investment-analyzer";

type FormState = {
  tickerInput: string;
  historicalDate: string;
  spendAmount: string;
};

const premiumRoles = new Set(["premium_user", "advisor", "admin", "superadmin"]);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function parseTickers(input: string) {
  const normalized: string[] = [];
  for (const ticker of input.split(",")) {
    const cleanTicker = ticker.trim().replace(/\s+/g, "").toUpperCase();
    if (cleanTicker && !normalized.includes(cleanTicker)) normalized.push(cleanTicker);
  }
  return normalized;
}

function SummaryCard({ label, value, emphasis }: { label: string; value: string; emphasis?: "positive" | "negative" }) {
  const valueClass = emphasis === "positive" ? "text-emerald-700" : emphasis === "negative" ? "text-red-700" : "text-[#0A2540]";
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function InvestmentAnalyzerPage() {
  const { user, accountStatus } = useWorkspaceUser();
  const [form, setForm] = useState<FormState>({ tickerInput: "", historicalDate: "", spendAmount: "" });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestmentAnalysisResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canUseAnalyzer = premiumRoles.has(accountStatus?.role ?? "");
  const tickers = useMemo(() => parseTickers(form.tickerInput), [form.tickerInput]);
  const today = new Date().toISOString().slice(0, 10);

  const validate = () => {
    const spendAmount = Number(form.spendAmount);
    if (tickers.length === 0) return "Enter at least one ticker.";
    if (tickers.length > 5) return "Enter no more than 5 tickers.";
    if (!form.historicalDate) return "Choose a historical investment date.";
    if (form.historicalDate >= today) return "Choose a date before today.";
    if (!Number.isFinite(spendAmount) || spendAmount <= 0) return "Enter a spend amount greater than $0.";
    return null;
  };

  const runAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    setServerError(null);
    const error = validate();
    setValidationError(error);
    if (error) return;

    setLoading(true);
    const token = await getIdentityToken(user);
    if (!token) {
      setServerError("Your session could not be verified. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/investment-analyzer-analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tickers,
          historicalDate: form.historicalDate,
          spendAmount: Number(form.spendAmount)
        })
      });
      const payload = (await response.json()) as InvestmentAnalysisResponse & { error?: string };
      if (!response.ok) {
        setServerError(payload.error ?? "Unable to run the analysis.");
        return;
      }
      setResult(payload);
    } catch {
      setServerError("Unable to run the analysis right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!canUseAnalyzer) {
    return (
      <div className="space-y-4">
        <section className="card space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tools</p>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Investment What-If Analyzer</h1>
          <p className="text-sm text-slate-600">See what a past investment in a basket of stocks or ETFs could be worth today.</p>
        </section>
        <section className="card border border-amber-200 bg-amber-50">
          <h2 className="text-lg font-semibold text-[#0A2540]">Premium feature</h2>
          <p className="mt-2 text-sm text-amber-800">Investment Analyzer is available to premium users, advisors, and admins.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tools</p>
        <h1 className="text-2xl font-semibold text-[#0A2540]">Investment What-If Analyzer</h1>
        <p className="text-sm text-slate-600">See what a past investment in a basket of stocks or ETFs could be worth today.</p>
      </section>

      <form onSubmit={runAnalysis} className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[#0A2540]">Ticker basket</span>
            <input
              value={form.tickerInput}
              onChange={(event) => setForm((current) => ({ ...current, tickerInput: event.target.value.toUpperCase() }))}
              placeholder="AAPL, MSFT, VOO, SCHD, O"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[#0A2540]">Historical investment date</span>
            <input
              type="date"
              value={form.historicalDate}
              max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
              onChange={(event) => setForm((current) => ({ ...current, historicalDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[#0A2540]">Total spend amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.spendAmount}
              onChange={(event) => setForm((current) => ({ ...current, spendAmount: event.target.value }))}
              placeholder="10000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-medium text-[#0A2540]">Allocation method:</span> Equal allocation across all tickers
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-medium text-[#0A2540]">Dividend treatment:</span> Dividends added as cash, not reinvested.
          </div>
        </div>

        {tickers.length > 0 ? <p className="text-xs text-slate-500">Normalized tickers: {tickers.join(", ")}</p> : null}
        {validationError ? <p className="text-sm font-medium text-red-700">{validationError}</p> : null}
        {serverError ? <p className="text-sm font-medium text-red-700">{serverError}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#123A5C] disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Analyzing historical prices and dividends..." : "Run Analyzer"}
        </button>
      </form>

      <section className="card bg-blue-50/70">
        <h2 className="text-lg font-semibold text-[#0A2540]">Assumptions used in this MVP</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Equal allocation across all selected tickers.</li>
          <li>Whole shares only.</li>
          <li>Historical reference price uses the selected date or the next available trading day.</li>
          <li>Dividends/distributions are added as cash and not reinvested.</li>
          <li>Taxes, fees, and inflation are not included.</li>
          <li>Results are for education and planning purposes only, not investment advice.</li>
        </ul>
      </section>

      {result ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Original Spend" value={formatCurrency(result.summary.originalSpendAmount)} />
            <SummaryCard label="Amount Invested" value={formatCurrency(result.summary.totalAmountInvested)} />
            <SummaryCard label="Leftover Cash" value={formatCurrency(result.summary.totalLeftoverCash)} />
            <SummaryCard label="Current Share Value" value={formatCurrency(result.summary.currentShareValue)} />
            <SummaryCard label="Estimated Dividends" value={formatCurrency(result.summary.estimatedDividendsReceived)} />
            <SummaryCard label="Total Value Today" value={formatCurrency(result.summary.totalCurrentPortfolioValue)} />
            <SummaryCard label="Total Gain/Loss" value={formatCurrency(result.summary.totalGainLoss)} emphasis={result.summary.totalGainLoss >= 0 ? "positive" : "negative"} />
            <SummaryCard label="Total Return %" value={formatPercent(result.summary.totalReturnPercent)} emphasis={result.summary.totalReturnPercent >= 0 ? "positive" : "negative"} />
          </section>

          {result.warnings.length > 0 ? (
            <section className="card border border-amber-200 bg-amber-50">
              <h2 className="text-lg font-semibold text-[#0A2540]">Warnings</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </section>
          ) : null}

          <section className="card overflow-hidden">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-[#0A2540]">Ticker Breakdown</h2>
              <p className="text-sm text-slate-600">Whole-share purchase results by ticker.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Ticker</th>
                    <th className="px-3 py-2">Allocation</th>
                    <th className="px-3 py-2">Reference Date</th>
                    <th className="px-3 py-2">Historical Close</th>
                    <th className="px-3 py-2">Shares</th>
                    <th className="px-3 py-2">Invested</th>
                    <th className="px-3 py-2">Leftover</th>
                    <th className="px-3 py-2">Current Price</th>
                    <th className="px-3 py-2">Share Value</th>
                    <th className="px-3 py-2">Dividends</th>
                    <th className="px-3 py-2">Total Value</th>
                    <th className="px-3 py-2">Gain/Loss</th>
                    <th className="px-3 py-2">Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {result.positions.map((position) => (
                    <tr key={position.ticker} className={position.error ? "bg-red-50/70" : "bg-white"}>
                      <td className="px-3 py-3 font-semibold text-[#0A2540]">
                        {position.ticker}
                        {position.error ? <p className="mt-1 text-xs font-medium text-red-700">{position.error}</p> : null}
                      </td>
                      <td className="px-3 py-3">{formatCurrency(position.allocationAmount)}</td>
                      <td className="px-3 py-3">{formatDate(position.referenceDateUsed)}</td>
                      <td className="px-3 py-3">{formatCurrency(position.historicalClosePrice)}</td>
                      <td className="px-3 py-3">{position.sharesPurchased}</td>
                      <td className="px-3 py-3">{formatCurrency(position.amountInvested)}</td>
                      <td className="px-3 py-3">{formatCurrency(position.leftoverCash)}</td>
                      <td className="px-3 py-3">{formatCurrency(position.currentPrice)}</td>
                      <td className="px-3 py-3">{formatCurrency(position.currentShareValue)}</td>
                      <td className="px-3 py-3">{formatCurrency(position.estimatedDividends)}</td>
                      <td className="px-3 py-3">{formatCurrency(position.totalCurrentValue)}</td>
                      <td className={`px-3 py-3 font-medium ${position.gainLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(position.gainLoss)}</td>
                      <td className={`px-3 py-3 font-medium ${position.returnPercent >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatPercent(position.returnPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card border border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-[#0A2540]">Save Analysis</h2>
            <p className="mt-2 text-sm text-slate-600">Saving investment analyses is planned for a future iteration after the investment report storage pattern is finalized.</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

