import { sql } from "../../lib/db/neon";
import type { DividendYieldLookup } from "../../lib/market-data/dividend-yield-provider";
import type { DividendYieldSource } from "../../lib/market-data/types";

export type DividendYieldCacheRow = {
  ticker: string;
  company_name: string | null;
  dividend_yield_percent: string | number | null;
  annual_dividend_per_share: string | number | null;
  current_price: string | number | null;
  payout_frequency: string | null;
  source: string;
  raw_json: Record<string, unknown> | null;
  fetched_at: string | null;
  expires_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const CACHE_TTL_HOURS = 24;

export function normalizeYieldTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
}

export function isValidYieldTicker(value: string) {
  return /^[A-Z0-9.-]{1,12}$/.test(value);
}

export async function ensureDividendYieldCacheTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS dividend_yield_cache (
      ticker TEXT PRIMARY KEY,
      company_name TEXT,
      dividend_yield_percent NUMERIC,
      annual_dividend_per_share NUMERIC,
      current_price NUMERIC,
      payout_frequency TEXT,
      source TEXT NOT NULL DEFAULT 'massive',
      raw_json JSONB,
      fetched_at TIMESTAMP DEFAULT now(),
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `;
  await sql`ALTER TABLE dividend_yield_cache ADD COLUMN IF NOT EXISTS current_price NUMERIC`;
  await sql`CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_ticker ON dividend_yield_cache(ticker)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_fetched_at ON dividend_yield_cache(fetched_at)`;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_expires_at
    ON dividend_yield_cache(expires_at)
  `;
}

export function cacheRowToResult(row: DividendYieldCacheRow, status: "cached" | "stale") {
  return {
    ticker: row.ticker,
    companyName: row.company_name,
    dividendYieldPercent: row.dividend_yield_percent === null ? null : Number(row.dividend_yield_percent),
    annualDividendPerShare: row.annual_dividend_per_share === null ? null : Number(row.annual_dividend_per_share),
    currentPrice: row.current_price === null ? null : Number(row.current_price),
    payoutFrequency: row.payout_frequency,
    source: "cache" as DividendYieldSource,
    providerSource: row.source,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    status
  };
}

export function isFreshCache(row: DividendYieldCacheRow | null) {
  if (!row) return false;
  const freshnessDate = row.expires_at ? new Date(row.expires_at) : row.fetched_at ? new Date(row.fetched_at) : null;
  if (!freshnessDate || Number.isNaN(freshnessDate.getTime())) return false;
  if (row.expires_at) return freshnessDate.getTime() > Date.now();
  return Date.now() - freshnessDate.getTime() < CACHE_TTL_HOURS * 60 * 60 * 1000;
}

export async function getYieldCacheRow(ticker: string) {
  const rows = await sql`
    SELECT ticker, company_name, dividend_yield_percent, annual_dividend_per_share, current_price, payout_frequency, source, raw_json, fetched_at, expires_at, created_at, updated_at
    FROM dividend_yield_cache
    WHERE ticker = ${ticker}
    LIMIT 1
  ` as DividendYieldCacheRow[];
  return rows[0] ?? null;
}

export async function upsertYieldCache(result: DividendYieldLookup) {
  const rows = await sql`
    INSERT INTO dividend_yield_cache (
      ticker,
      company_name,
      dividend_yield_percent,
      annual_dividend_per_share,
      current_price,
      payout_frequency,
      source,
      raw_json,
      fetched_at,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${result.ticker},
      ${result.companyName},
      ${result.dividendYieldPercent},
      ${result.annualDividendPerShare},
      ${result.currentPrice},
      ${result.payoutFrequency},
      ${result.source},
      ${JSON.stringify(result.raw ?? {})}::jsonb,
      NOW(),
      NOW() + INTERVAL '24 hours',
      NOW(),
      NOW()
    )
    ON CONFLICT (ticker) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      dividend_yield_percent = EXCLUDED.dividend_yield_percent,
      annual_dividend_per_share = EXCLUDED.annual_dividend_per_share,
      current_price = EXCLUDED.current_price,
      payout_frequency = EXCLUDED.payout_frequency,
      source = EXCLUDED.source,
      raw_json = EXCLUDED.raw_json,
      fetched_at = EXCLUDED.fetched_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
    RETURNING ticker, company_name, dividend_yield_percent, annual_dividend_per_share, current_price, payout_frequency, source, raw_json, fetched_at, expires_at, created_at, updated_at
  ` as DividendYieldCacheRow[];
  return rows[0];
}
