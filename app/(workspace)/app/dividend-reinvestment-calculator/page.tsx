"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";
import { PremiumLockedCard } from "@/components/premium-locked-card";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
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

type ChartView = "totalValueWithCashDividends" | "projectedShareValue" | "dividendsGenerated" | "annualDividendIncome" | "sharesOwned" | "all";

type SavedProjectionListItem = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  position_count: number;
  summary_preview?: Record<string, unknown>;
};

type SavedProjectionPayload = {
  id: string;
  title: string;
  positions_json: DividendPositionInput[];
  settings_json: {
    projectionMonths?: number;
    projectionInterval?: ProjectionInterval;
    chartView?: ChartView;
  };
  summary_json?: Record<string, unknown>;
  projection_json?: unknown[];
};

const frequencyOptions: Array<{ value: DividendPayoutFrequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" }
];

const chartViews: Array<{ value: ChartView; label: string }> = [
  { value: "totalValueWithCashDividends", label: "Total Value Including Cash Dividends" },
  { value: "projectedShareValue", label: "Projected Share Value" },
  { value: "dividendsGenerated", label: "Dividends Generated" },
  { value: "annualDividendIncome", label: "Annual Dividend Income" },
  { value: "sharesOwned", label: "Shares Owned" },
  { value: "all", label: "All" }
];
const chartViewValues = new Set(chartViews.map((option) => option.value));

const intervalOptions: Array<{ value: ProjectionInterval; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "payout", label: "Payout Frequency Based" },
  { value: "yearly", label: "Yearly" }
];

const REPORT_VERSION = "Clarity Report v1.0";
const CALCULATOR_VERSION = "dividend-calculator-v1";
const EDUCATIONAL_DISCLAIMER = "Results are for education and planning purposes only and are not investment advice.";
const SAVE_ASSUMPTIONS = {
  dividendYieldConstant: true,
  payoutFrequencyPerHolding: true,
  fractionalShares: true,
  reinvestmentPriceUsesBuyPrice: true,
  excludesTaxesFeesDividendCutsMarketChanges: true,
  educationalOnly: true
};

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

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved projection" : date.toLocaleString();
};

function normalizeChartView(value: unknown): ChartView {
  return chartViewValues.has(value as ChartView) ? value as ChartView : "all";
}

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
  const { user, accountStatus } = useWorkspaceUser();
  const canUseCalculator = canUsePremiumTools(accountStatus?.role);
  const [formPosition, setFormPosition] = useState<DividendPositionInput>(emptyPosition);
  const [positions, setPositions] = useState<DividendPositionInput[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [chartView, setChartView] = useState<ChartView>("all");
  const [projectionInterval, setProjectionInterval] = useState<ProjectionInterval>("monthly");
  const [saveTitle, setSaveTitle] = useState("");
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [selectedSaveId, setSelectedSaveId] = useState("");
  const [savedProjections, setSavedProjections] = useState<SavedProjectionListItem[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaves, setIsLoadingSaves] = useState(false);
  const [yieldLookupMessage, setYieldLookupMessage] = useState<string | null>(null);
  const [yieldLookupMessageType, setYieldLookupMessageType] = useState<"success" | "warning" | "error" | null>(null);
  const [isLookingUpYield, setIsLookingUpYield] = useState(false);

  const basket = useMemo(
    () => calculateDividendBasket(positions, projectionMonths, projectionInterval),
    [positions, projectionMonths, projectionInterval]
  );
  const hasHoldings = positions.length > 0;
  const resultsById = useMemo(() => new Map(basket.positions.map((position) => [position.id, position])), [basket.positions]);
  const defaultSaveTitle = useMemo(() => {
    const symbols = positions.map((position) => normalizeDividendSymbol(position.symbol)).filter(Boolean).slice(0, 3);
    if (symbols.length > 0) return `Dividend Projection - ${symbols.join(", ")}`;
    return `Dividend Projection - ${new Date().toLocaleDateString()}`;
  }, [positions]);

  const getTokenOrSetError = useCallback(async () => {
    const token = await getIdentityToken(user);
    if (!token) {
      setSaveMessageType("error");
      setSaveMessage("Your session could not be verified. Please sign in again.");
      return null;
    }
    return token;
  }, [user]);

  const loadSavedProjectionList = useCallback(async () => {
    if (!canUseCalculator) return;
    setIsLoadingSaves(true);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsLoadingSaves(false);
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/dividend-calculator-list", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json() as { saves?: SavedProjectionListItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load saved projections.");
      setSavedProjections(payload.saves ?? []);
      if (!selectedSaveId && payload.saves?.[0]) setSelectedSaveId(payload.saves[0].id);
    } catch (error) {
      setSaveMessageType("error");
      setSaveMessage(error instanceof Error ? error.message : "Unable to load saved projections.");
    } finally {
      setIsLoadingSaves(false);
    }
  }, [canUseCalculator, getTokenOrSetError, selectedSaveId]);

  useEffect(() => {
    if (canUseCalculator) void loadSavedProjectionList();
  }, [canUseCalculator, loadSavedProjectionList]);

  const saveProjection = async (saveAsNew = false) => {
    if (!hasHoldings || isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsSaving(false);
      return;
    }

    const title = (saveTitle.trim() || defaultSaveTitle).slice(0, 120);
    const payload = {
      id: saveAsNew ? undefined : currentSaveId ?? undefined,
      title,
      positions,
      settings: {
        projectionMonths,
        projectionInterval,
        chartView,
        reportVersion: REPORT_VERSION,
        calculatorVersion: CALCULATOR_VERSION
      },
      assumptions: SAVE_ASSUMPTIONS,
      disclaimer: EDUCATIONAL_DISCLAIMER,
      summary: basket.summary,
      projection: basket.projection
    };

    try {
      const response = await fetch("/.netlify/functions/dividend-calculator-save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Unable to save this projection.");
      setCurrentSaveId(result.id);
      setSelectedSaveId(result.id);
      setSaveTitle(title);
      setSaveMessageType("success");
      setSaveMessage(saveAsNew ? "Saved as a new dividend projection." : "Dividend projection saved.");
      await loadSavedProjectionList();
    } catch (error) {
      setSaveMessageType("error");
      setSaveMessage(error instanceof Error ? error.message : "Unable to save this projection.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedProjection = async () => {
    if (!selectedSaveId || isLoadingSaves) return;
    setIsLoadingSaves(true);
    setSaveMessage(null);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsLoadingSaves(false);
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/dividend-calculator-get?id=${encodeURIComponent(selectedSaveId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json() as { save?: SavedProjectionPayload; error?: string };
      if (!response.ok || !payload.save) throw new Error(payload.error ?? "Unable to load this projection.");
      const save = payload.save;
      const loadedPositions = Array.isArray(save.positions_json) ? save.positions_json : [];
      setPositions(loadedPositions);
      setProjectionMonths(Number(save.settings_json?.projectionMonths ?? 12));
      setProjectionInterval(save.settings_json?.projectionInterval ?? "payout");
      setChartView(normalizeChartView(save.settings_json?.chartView));
      setCurrentSaveId(save.id);
      setSaveTitle(save.title);
      setEditingId(null);
      setFormPosition(emptyPosition());
      setFormErrors([]);
      setSaveMessageType("success");
      setSaveMessage("Saved projection loaded. Results have been recalculated from the saved inputs.");
    } catch (error) {
      setSaveMessageType("error");
      setSaveMessage(error instanceof Error ? error.message : "Unable to load this projection.");
    } finally {
      setIsLoadingSaves(false);
    }
  };

  const deleteSavedProjection = async () => {
    if (!selectedSaveId || isLoadingSaves) return;
    const selectedSave = savedProjections.find((save) => save.id === selectedSaveId);
    const confirmed = window.confirm(`Delete "${selectedSave?.title ?? "this saved projection"}"? Your current calculator inputs will stay on screen.`);
    if (!confirmed) return;

    setIsLoadingSaves(true);
    setSaveMessage(null);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsLoadingSaves(false);
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/dividend-calculator-delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: selectedSaveId })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete this projection.");
      if (currentSaveId === selectedSaveId) {
        setCurrentSaveId(null);
        setSaveTitle("");
      }
      setSelectedSaveId("");
      setSaveMessageType("success");
      setSaveMessage("Saved projection deleted.");
      await loadSavedProjectionList();
    } catch (error) {
      setSaveMessageType("error");
      setSaveMessage(error instanceof Error ? error.message : "Unable to delete this projection.");
    } finally {
      setIsLoadingSaves(false);
    }
  };

  const lookupDividendYield = async () => {
    const ticker = normalizeDividendSymbol(formPosition.symbol);
    if (!ticker) {
      setYieldLookupMessageType("error");
      setYieldLookupMessage("Enter a ticker before looking up dividend yield.");
      return;
    }

    setIsLookingUpYield(true);
    setYieldLookupMessage(null);
    const token = await getTokenOrSetError();
    if (!token) {
      setIsLookingUpYield(false);
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/dividend-yield-lookup?ticker=${encodeURIComponent(ticker)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json() as {
        result?: { dividendYieldPercent?: number | null; companyName?: string | null; status?: "cached" | "stale" };
        message?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok) throw new Error(payload.error ?? "Dividend yield unavailable. Please enter it manually.");
      const yieldPercent = payload.result?.dividendYieldPercent;
      if (typeof yieldPercent !== "number" || !Number.isFinite(yieldPercent)) {
        throw new Error("Dividend yield unavailable. Please enter it manually.");
      }

      setFormPosition((current) => ({
        ...current,
        symbol: ticker,
        dividendYieldPercent: Number(yieldPercent.toFixed(4))
      }));

      if (payload.warning || payload.result?.status === "stale") {
        setYieldLookupMessageType("warning");
        setYieldLookupMessage("Using previously cached yield. Please verify.");
      } else {
        setYieldLookupMessageType("success");
        setYieldLookupMessage(payload.message ?? "Yield loaded from cache.");
      }
    } catch (error) {
      setYieldLookupMessageType("error");
      setYieldLookupMessage(error instanceof Error ? error.message : "Yield unavailable. Please enter manually.");
    } finally {
      setIsLookingUpYield(false);
    }
  };

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
  const hasHighYieldPosition = positions.some((position) => position.dividendYieldPercent >= 25);
  const showLongHighYieldWarning = projectionMonths >= 60 && hasHighYieldPosition;

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
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={formPosition.dividendYieldPercent} onChange={(event) => updateForm("dividendYieldPercent", setNumber(event.target.value))} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button
                type="button"
                onClick={lookupDividendYield}
                disabled={isLookingUpYield || !formPosition.symbol.trim()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLookingUpYield ? "Looking..." : "Lookup Yield"}
              </button>
            </div>
            {yieldLookupMessage ? (
              <p className={`mt-1 text-xs ${yieldLookupMessageType === "success" ? "text-emerald-700" : yieldLookupMessageType === "warning" ? "text-amber-700" : "text-red-700"}`}>
                {yieldLookupMessage}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">Dividend yield data may be delayed, incomplete, or unavailable. Please verify before relying on it.</p>
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

      <section className="card space-y-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Saved Projections</h2>
            <p className="mt-1 text-sm text-slate-600">Save the full basket, calculator settings, and locally calculated projection.</p>
          </div>
          {currentSaveId ? <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Editing saved projection</span> : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-sm">
            <FieldLabel>Projection title</FieldLabel>
            <input
              value={saveTitle}
              onChange={(event) => setSaveTitle(event.target.value)}
              placeholder={defaultSaveTitle}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => saveProjection(false)}
              disabled={!hasHoldings || isSaving}
              className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? "Saving..." : "Save Current Projection"}
            </button>
            {currentSaveId ? (
              <ActionButton onClick={() => saveProjection(true)} disabled={!hasHoldings || isSaving}>Save As New</ActionButton>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-sm">
            <FieldLabel>Saved projection</FieldLabel>
            <select
              value={selectedSaveId}
              onChange={(event) => setSelectedSaveId(event.target.value)}
              disabled={isLoadingSaves || savedProjections.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">{savedProjections.length === 0 ? "No saved projections yet" : "Choose a saved projection"}</option>
              {savedProjections.map((save) => (
                <option key={save.id} value={save.id}>
                  {save.title} - {save.position_count} holding{save.position_count === 1 ? "" : "s"} - {formatDateTime(save.updated_at)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <ActionButton onClick={loadSavedProjectionList} disabled={isLoadingSaves}>{isLoadingSaves ? "Refreshing..." : "Refresh Saved List"}</ActionButton>
            <ActionButton onClick={loadSavedProjection} disabled={!selectedSaveId || isLoadingSaves}>Load</ActionButton>
            <ActionButton onClick={deleteSavedProjection} disabled={!selectedSaveId || isLoadingSaves}>Delete</ActionButton>
          </div>
        </div>

        {saveMessage ? (
          <div className={`rounded-lg border px-3 py-2 text-sm ${saveMessageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {saveMessage}
          </div>
        ) : null}
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
          <SummaryCard label="Current Annual Dividend Income" value={formatCurrency(summary.currentAnnualDividendIncome)} />
          <SummaryCard label="Projected Share Value" value={formatCurrency(summary.projectedShareValue)} note="Reinvested dividends are already reflected here." />
          <SummaryCard label="Dividends Generated" value={formatCurrency(summary.dividendsGenerated)} />
          <SummaryCard label="Dividends Reinvested" value={formatCurrency(summary.dividendsReinvested)} note="Already included in projected share value." />
          <SummaryCard label="Cash Dividends Received" value={formatCurrency(summary.cashDividendsReceived)} />
          <SummaryCard label="Total Value Including Cash Dividends" value={formatCurrency(summary.totalValueWithCashDividends)} />
          <SummaryCard label="Growth From Reinvestment" value={formatCurrency(summary.totalGrowthFromReinvestment)} />
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
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Dividends shown as reinvested are already reflected in projected share value. Do not add reinvested dividends to projected share value again.
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
          <SummaryCard label="Projected Share Value" value={formatCurrency(summary.projectedShareValue)} />
          <SummaryCard label="Projected Annual Dividend Income" value={formatCurrency(summary.projectedAnnualDividendIncome)} />
          <SummaryCard label="Dividends Generated" value={formatCurrency(summary.dividendsGenerated)} />
          <SummaryCard label="Cash Dividends Received" value={formatCurrency(summary.cashDividendsReceived)} />
          <SummaryCard label="Total Value Including Cash Dividends" value={formatCurrency(summary.totalValueWithCashDividends)} />
          <SummaryCard label="Total Growth From Reinvestment" value={formatCurrency(summary.totalGrowthFromReinvestment)} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Value Without Reinvestment" value={formatCurrency(summary.noReinvestmentValue)} />
          <SummaryCard label="Value With Selected Settings" value={formatCurrency(summary.reinvestmentValue)} />
          <SummaryCard label="Reinvestment Difference" value={formatCurrency(summary.reinvestmentDifference)} />
        </div>
        {hasHighYieldPosition ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            High-yield warning: This projection assumes the entered dividend yield remains constant. High-yield funds may experience changing payouts, NAV decline, or price volatility that this calculator does not model.
          </div>
        ) : null}
        {showLongHighYieldWarning ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Long-term high-yield projections can become unrealistic if dividend yield and share price are held constant.
          </div>
        ) : null}
        <div className="h-80">
          {hasHoldings ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={basket.projection} margin={{ top: 10, right: 18, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" minTickGap={24} />
                <YAxis tickFormatter={(value) => chartView === "sharesOwned" ? formatShares(Number(value)) : formatCompactCurrency(Number(value))} />
                <Tooltip formatter={(value, name) => name === "Shares Owned" ? formatShares(Number(value)) : formatCurrency(Number(value))} labelFormatter={(value) => String(value)} />
                {showLine("totalValueWithCashDividends") ? <Line type="monotone" dataKey="totalValueWithCashDividends" name="Total Value Including Cash Dividends" stroke="#2563EB" strokeWidth={2} dot={false} /> : null}
                {showLine("projectedShareValue") ? <Line type="monotone" dataKey="projectedShareValue" name="Projected Share Value" stroke="#14B8A6" strokeWidth={2} dot={false} /> : null}
                {showLine("dividendsGenerated") ? <Line type="monotone" dataKey="dividendsGenerated" name="Dividends Generated" stroke="#8B5CF6" strokeWidth={2} dot={false} /> : null}
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
          <table className="min-w-[1400px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Ticker/Name</th>
                <th className="py-2 pr-3">Buy Price</th>
                <th className="py-2 pr-3">Quantity</th>
                <th className="py-2 pr-3">Starting Value</th>
                <th className="py-2 pr-3">Yield</th>
                <th className="py-2 pr-3">Payout Frequency</th>
                <th className="py-2 pr-3">Dividend/Share/Period</th>
                <th className="py-2 pr-3">Total Dividend/Period</th>
                <th className="py-2 pr-3">Annual Income</th>
                <th className="py-2 pr-3">Projected Shares</th>
                <th className="py-2 pr-3">Projected Share Value</th>
                <th className="py-2 pr-3">Dividends Generated</th>
                <th className="py-2 pr-3">Cash Dividends Received</th>
                <th className="py-2 pr-3">Total Value Including Cash Dividends</th>
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
                  <td className="py-3 pr-3">{formatCurrency(position.projectedShareValue)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.dividendsGenerated)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.cashDividendsReceived)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.totalValueWithCashDividends)}</td>
                  <td className="py-3 pr-3">{formatCurrency(position.projectedAnnualDividendIncome)}</td>
                </tr>
              ))}
              {!hasHoldings ? <tr><td colSpan={15} className="py-6 text-center text-sm text-slate-500">Add a holding to calculate the breakdown.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold text-[#0A2540]">Assumptions</h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-[#0A2540]">Assumptions used in this calculator:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Dividend yield is assumed to remain constant.</li>
            <li>Share price is assumed to remain constant.</li>
            <li>Each holding uses the payout frequency selected by the user.</li>
            <li>Reinvested dividends buy fractional shares.</li>
            <li>Reinvested dividends are assumed to buy shares at the entered buy price.</li>
            <li>High-yield funds may reduce distributions or experience price changes that are not reflected in this calculator.</li>
            <li>When dividends are reinvested, dividend cash is converted into additional shares and is already included in projected share value.</li>
            <li>Taxes, fees, distribution changes, and market price changes are not included.</li>
            <li>Basket dividend yield is calculated as weighted annual dividend income divided by total basket value.</li>
            <li>Results are for education and planning purposes only and are not investment advice.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">TODO: Individual position save can be added later.</p>
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
        <MiniMetric label="Projected share value" value={formatCurrency(result.projectedShareValue)} />
        <MiniMetric label="Cash dividends received" value={formatCurrency(result.cashDividendsReceived)} />
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
