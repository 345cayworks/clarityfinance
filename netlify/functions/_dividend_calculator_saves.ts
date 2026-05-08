import { sql } from "../../lib/db/neon";
import {
  normalizeDividendSymbol,
  projectionPeriodOptions,
  validateDividendPosition,
  type DividendPayoutFrequency,
  type DividendPositionInput,
  type ProjectionInterval
} from "../../lib/finance/dividend-reinvestment-calculator";

export const DIVIDEND_CALCULATOR_REPORT_VERSION = "Clarity Report v1.0";
export const DIVIDEND_CALCULATOR_VERSION = "dividend-calculator-v1";
export const DIVIDEND_CALCULATOR_DISCLAIMER = "Results are for education and planning purposes only and are not investment advice.";

export const DIVIDEND_CALCULATOR_ASSUMPTIONS = {
  dividendYieldConstant: true,
  payoutFrequencyPerHolding: true,
  fractionalShares: true,
  reinvestmentPriceUsesBuyPrice: true,
  excludesTaxesFeesDividendCutsMarketChanges: true,
  educationalOnly: true
};

const payoutFrequencies = new Set<DividendPayoutFrequency>(["weekly", "monthly", "quarterly", "annually"]);
const projectionIntervals = new Set<ProjectionInterval>(["payout", "monthly", "yearly"]);
const chartViews = new Set(["portfolioValue", "cumulativeDividends", "annualDividendIncome", "sharesOwned", "all"]);
const allowedProjectionMonths = new Set(projectionPeriodOptions.map((option) => option.months));

export type DividendCalculatorSettings = {
  projectionMonths: number;
  projectionInterval: ProjectionInterval;
  chartView: string;
  reportVersion: string;
  calculatorVersion: string;
};

export type DividendCalculatorSaveBody = {
  id?: unknown;
  title?: unknown;
  positions?: unknown;
  settings?: unknown;
  summary?: unknown;
  projection?: unknown;
};

export async function ensureDividendCalculatorSavesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS dividend_calculator_saves (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      positions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      projection_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      report_version TEXT DEFAULT 'Clarity Report v1.0',
      disclaimer_text TEXT,
      assumptions_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_dividend_calculator_saves_user_updated
    ON dividend_calculator_saves(user_id, updated_at DESC)
  `;
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function validateSettings(value: unknown) {
  const settings = asObject(value);
  const projectionMonths = Math.round(asNumber(settings.projectionMonths));
  const projectionInterval = String(settings.projectionInterval ?? "payout") as ProjectionInterval;
  const chartView = String(settings.chartView ?? "all");
  const errors: string[] = [];

  if (!allowedProjectionMonths.has(projectionMonths)) errors.push("Projection period is invalid.");
  if (!projectionIntervals.has(projectionInterval)) errors.push("Projection interval is invalid.");
  if (!chartViews.has(chartView)) errors.push("Chart view is invalid.");

  return {
    errors,
    settings: {
      projectionMonths: allowedProjectionMonths.has(projectionMonths) ? projectionMonths : 12,
      projectionInterval: projectionIntervals.has(projectionInterval) ? projectionInterval : "payout",
      chartView: chartViews.has(chartView) ? chartView : "all",
      reportVersion: DIVIDEND_CALCULATOR_REPORT_VERSION,
      calculatorVersion: DIVIDEND_CALCULATOR_VERSION
    } satisfies DividendCalculatorSettings
  };
}

function normalizePosition(value: unknown): DividendPositionInput | null {
  const input = asObject(value);
  const payoutFrequency = String(input.payoutFrequency ?? "") as DividendPayoutFrequency;
  if (!payoutFrequencies.has(payoutFrequency)) return null;

  return {
    id: String(input.id ?? "").trim() || crypto.randomUUID(),
    symbol: normalizeDividendSymbol(String(input.symbol ?? "")),
    buyPrice: asNumber(input.buyPrice),
    quantity: asNumber(input.quantity),
    dividendYieldPercent: asNumber(input.dividendYieldPercent),
    payoutFrequency,
    reinvestDividends: Boolean(input.reinvestDividends)
  };
}

export function validateSaveBody(body: DividendCalculatorSaveBody) {
  const errors: string[] = [];
  const title = String(body.title ?? "").trim();
  if (!title) errors.push("Title is required.");
  if (title.length > 120) errors.push("Title must be 120 characters or fewer.");

  const rawPositions = Array.isArray(body.positions) ? body.positions : [];
  if (rawPositions.length === 0) errors.push("At least one position is required.");
  if (rawPositions.length > 10) errors.push("The basket can include up to 10 positions.");

  const positions: DividendPositionInput[] = [];
  rawPositions.slice(0, 10).forEach((rawPosition, index) => {
    const position = normalizePosition(rawPosition);
    if (!position) {
      errors.push(`Position ${index + 1} has an invalid payout frequency.`);
      return;
    }

    const positionErrors = validateDividendPosition(position, positions);
    positionErrors.forEach((error) => errors.push(`Position ${index + 1}: ${error}`));
    positions.push(position);
  });

  const { errors: settingErrors, settings } = validateSettings(body.settings);
  errors.push(...settingErrors);

  return {
    errors,
    title,
    positions,
    settings,
    summary: asObject(body.summary),
    projection: Array.isArray(body.projection) ? body.projection : []
  };
}
