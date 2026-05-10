import { sql } from "../db/neon";
import { AlphaVantageProvider } from "./alpha-vantage";
import { getConfiguredMarketDataProviderName, getMarketDataProvider } from "./provider";
import type { DailyAdjustedRecord } from "./types";

type MarketPriceHistoryRow = {
  ticker: string;
  price_date: string;
  close_price: string | number | null;
  adjusted_close_price: string | number | null;
  dividend_amount: string | number | null;
  split_coefficient: string | number | null;
  source: string;
  raw_json: Record<string, unknown> | null;
};

type SyncStatusRow = {
  ticker: string;
  source: string;
  last_full_refresh_at: string | null;
  last_trading_date_cached: string | null;
  status: string;
  error_message: string | null;
};

export type SeriesCacheStatus = "cached" | "refreshed" | "stale_cache" | "unavailable";

export type DailyAdjustedSeriesResult = {
  ticker: string;
  series: DailyAdjustedRecord[];
  cacheStatus: SeriesCacheStatus;
  warning: string | null;
};

const CACHE_FRESH_MS = 24 * 60 * 60 * 1000;

export function normalizeTicker(ticker: string) {
  return ticker.trim().replace(/\s+/g, "").toUpperCase();
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

export async function ensureMarketPriceHistoryTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS market_price_history (
      ticker TEXT NOT NULL,
      price_date DATE NOT NULL,
      close_price NUMERIC,
      adjusted_close_price NUMERIC,
      dividend_amount NUMERIC,
      split_coefficient NUMERIC,
      source TEXT NOT NULL DEFAULT 'alpha_vantage',
      fetched_at TIMESTAMP DEFAULT now(),
      raw_json JSONB,
      PRIMARY KEY (ticker, price_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS market_data_sync_status (
      ticker TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'alpha_vantage',
      last_full_refresh_at TIMESTAMP,
      last_trading_date_cached DATE,
      status TEXT NOT NULL DEFAULT 'never_synced',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_market_price_history_ticker_date ON market_price_history(ticker, price_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_market_data_sync_status_updated ON market_data_sync_status(updated_at DESC)`;
}

function rowToRecord(row: MarketPriceHistoryRow): DailyAdjustedRecord {
  return {
    ticker: row.ticker,
    date: dateOnly(String(row.price_date)),
    close: toNumber(row.close_price),
    adjustedClose: toNumber(row.adjusted_close_price, toNumber(row.close_price)),
    dividendAmount: toNumber(row.dividend_amount),
    splitCoefficient: toNumber(row.split_coefficient, 1),
    source: row.source,
    raw: row.raw_json
  };
}

export async function getCachedDailySeries(ticker: string): Promise<DailyAdjustedRecord[]> {
  await ensureMarketPriceHistoryTables();
  const normalizedTicker = normalizeTicker(ticker);
  const rows = await sql`
    SELECT ticker, price_date, close_price, adjusted_close_price, dividend_amount, split_coefficient, source, raw_json
    FROM market_price_history
    WHERE ticker = ${normalizedTicker}
    ORDER BY price_date ASC
  ` as MarketPriceHistoryRow[];
  return rows.map(rowToRecord);
}

async function getSyncStatus(ticker: string) {
  const rows = await sql`
    SELECT ticker, source, last_full_refresh_at, last_trading_date_cached, status, error_message
    FROM market_data_sync_status
    WHERE ticker = ${ticker}
    LIMIT 1
  ` as SyncStatusRow[];
  return rows[0] ?? null;
}

export async function isTickerCacheFresh(ticker: string) {
  await ensureMarketPriceHistoryTables();
  const normalizedTicker = normalizeTicker(ticker);
  const status = await getSyncStatus(normalizedTicker);
  if (!status?.last_full_refresh_at) return false;
  const refreshedAt = new Date(status.last_full_refresh_at);
  if (Number.isNaN(refreshedAt.getTime())) return false;
  return Date.now() - refreshedAt.getTime() < CACHE_FRESH_MS;
}

const FRIENDLY_MARKET_DATA_ERROR = "Market data unavailable. Please try again later or enter values manually.";

async function updateSyncStatus(ticker: string, source: string, status: string, latestDate: string | null, errorMessage: string | null) {
  await sql`
    INSERT INTO market_data_sync_status (
      ticker,
      source,
      last_full_refresh_at,
      last_trading_date_cached,
      status,
      error_message,
      created_at,
      updated_at
    )
    VALUES (
      ${ticker},
      ${source},
      ${status === "synced" ? new Date().toISOString() : null},
      ${latestDate},
      ${status},
      ${errorMessage},
      NOW(),
      NOW()
    )
    ON CONFLICT (ticker) DO UPDATE SET
      source = EXCLUDED.source,
      last_full_refresh_at = COALESCE(EXCLUDED.last_full_refresh_at, market_data_sync_status.last_full_refresh_at),
      last_trading_date_cached = COALESCE(EXCLUDED.last_trading_date_cached, market_data_sync_status.last_trading_date_cached),
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      updated_at = NOW()
  `;
}

async function storeDailySeries(ticker: string, series: DailyAdjustedRecord[]) {
  const payload = series.map((record) => ({
    ticker,
    price_date: record.date,
    close_price: record.close,
    adjusted_close_price: record.adjustedClose,
    dividend_amount: record.dividendAmount,
    split_coefficient: record.splitCoefficient,
    source: record.source || "alpha_vantage",
    raw_json: record.raw ?? {}
  }));

  if (payload.length === 0) return;

  await sql`
    INSERT INTO market_price_history (
      ticker,
      price_date,
      close_price,
      adjusted_close_price,
      dividend_amount,
      split_coefficient,
      source,
      fetched_at,
      raw_json
    )
    SELECT
      ticker,
      price_date::date,
      close_price::numeric,
      adjusted_close_price::numeric,
      dividend_amount::numeric,
      split_coefficient::numeric,
      source,
      NOW(),
      raw_json::jsonb
    FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS row(
      ticker text,
      price_date text,
      close_price numeric,
      adjusted_close_price numeric,
      dividend_amount numeric,
      split_coefficient numeric,
      source text,
      raw_json jsonb
    )
    ON CONFLICT (ticker, price_date) DO UPDATE SET
      close_price = EXCLUDED.close_price,
      adjusted_close_price = EXCLUDED.adjusted_close_price,
      dividend_amount = EXCLUDED.dividend_amount,
      split_coefficient = EXCLUDED.split_coefficient,
      source = EXCLUDED.source,
      fetched_at = NOW(),
      raw_json = EXCLUDED.raw_json
  `;
}

export async function refreshTickerDailyAdjustedSeries(ticker: string): Promise<DailyAdjustedRecord[]> {
  await ensureMarketPriceHistoryTables();
  const normalizedTicker = normalizeTicker(ticker);
  const configuredProviderName = getConfiguredMarketDataProviderName();

  try {
    const providerSeries = await getMarketDataProvider().getDailyAdjustedSeries(normalizedTicker);
    const normalizedSeries = providerSeries
      .map((record) => ({ ...record, ticker: normalizedTicker, source: record.source || configuredProviderName }))
      .sort((a, b) => a.date.localeCompare(b.date));
    await storeDailySeries(normalizedTicker, normalizedSeries);
    const latestTradingDay = getLatestTradingDay(normalizedSeries);
    await updateSyncStatus(normalizedTicker, normalizedSeries[0]?.source ?? configuredProviderName, "synced", latestTradingDay?.date ?? null, null);
    return normalizedSeries;
  } catch (error) {
    if (configuredProviderName === "massive") {
      try {
        const fallbackSeries = await new AlphaVantageProvider().getDailyAdjustedSeries(normalizedTicker);
        const normalizedSeries = fallbackSeries
          .map((record) => ({ ...record, ticker: normalizedTicker, source: record.source || "alpha_vantage" }))
          .sort((a, b) => a.date.localeCompare(b.date));
        await storeDailySeries(normalizedTicker, normalizedSeries);
        const latestTradingDay = getLatestTradingDay(normalizedSeries);
        await updateSyncStatus(normalizedTicker, "alpha_vantage", "synced", latestTradingDay?.date ?? null, null);
        return normalizedSeries;
      } catch {
        await updateSyncStatus(normalizedTicker, configuredProviderName, "error", null, FRIENDLY_MARKET_DATA_ERROR);
        throw new Error(FRIENDLY_MARKET_DATA_ERROR);
      }
    }

    await updateSyncStatus(normalizedTicker, configuredProviderName, "error", null, FRIENDLY_MARKET_DATA_ERROR);
    throw new Error(FRIENDLY_MARKET_DATA_ERROR);
  }
}

export async function getOrRefreshDailyAdjustedSeries(ticker: string): Promise<DailyAdjustedSeriesResult> {
  const normalizedTicker = normalizeTicker(ticker);
  const cachedSeries = await getCachedDailySeries(normalizedTicker);
  const fresh = cachedSeries.length > 0 && await isTickerCacheFresh(normalizedTicker);
  if (fresh) {
    return { ticker: normalizedTicker, series: cachedSeries, cacheStatus: "cached", warning: null };
  }

  try {
    const refreshed = await refreshTickerDailyAdjustedSeries(normalizedTicker);
    return { ticker: normalizedTicker, series: refreshed, cacheStatus: "refreshed", warning: null };
  } catch (error) {
    if (cachedSeries.length > 0) {
      return {
        ticker: normalizedTicker,
        series: cachedSeries,
        cacheStatus: "stale_cache",
        warning: "Provider refresh failed; stale cached market data was used."
      };
    }
    throw error;
  }
}

export function findReferenceTradingDay(series: DailyAdjustedRecord[], requestedDate: string) {
  return series.find((record) => record.date >= requestedDate) ?? null;
}

export function getLatestTradingDay(series: DailyAdjustedRecord[]) {
  return series[series.length - 1] ?? null;
}

export function sumDividendsBetweenDates(series: DailyAdjustedRecord[], startDate: string, endDate: string) {
  return series
    .filter((record) => record.date >= startDate && record.date <= endDate)
    .reduce((sum, record) => sum + record.dividendAmount, 0);
}
