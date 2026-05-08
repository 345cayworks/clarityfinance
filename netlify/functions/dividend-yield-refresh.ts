import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getDividendYieldProvider } from "../../lib/market-data/dividend-yield-provider";
import { requireAdmin } from "./_access";
import {
  ensureDividendYieldCacheTable,
  getYieldCacheRow,
  isFreshCache,
  isValidYieldTicker,
  normalizeYieldTicker,
  upsertYieldCache
} from "./_dividend_yield_cache";
import { json } from "./_utils";

type TickerRow = {
  ticker: string;
};

const BATCH_SIZE = 20;

async function getSavedPortfolioTickers() {
  const rows = await sql`
    SELECT DISTINCT UPPER(position ->> 'symbol') AS ticker
    FROM dividend_calculator_saves,
      LATERAL jsonb_array_elements(positions_json) AS position
    WHERE position ->> 'symbol' IS NOT NULL
    LIMIT ${BATCH_SIZE * 3}
  ` as TickerRow[];

  return rows
    .map((row) => normalizeYieldTicker(row.ticker ?? ""))
    .filter((ticker) => ticker && isValidYieldTicker(ticker))
    .slice(0, BATCH_SIZE);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  await ensureDividendYieldCacheTable();
  const tickers = await getSavedPortfolioTickers();
  const provider = getDividendYieldProvider();
  const refreshed: string[] = [];
  const skippedFresh: string[] = [];
  const failed: Array<{ ticker: string; error: string }> = [];

  for (const ticker of tickers) {
    try {
      const cached = await getYieldCacheRow(ticker);
      if (cached && isFreshCache(cached)) {
        skippedFresh.push(ticker);
        continue;
      }

      const result = await provider.getDividendYield(ticker);
      await upsertYieldCache({ ...result, ticker });
      refreshed.push(ticker);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed.";
      console.error("dividend-yield-refresh ticker failed", { ticker, message });
      failed.push({ ticker, error: message });
    }
  }

  return json(200, {
    success: true,
    batchSize: BATCH_SIZE,
    checked: tickers.length,
    refreshed,
    skippedFresh,
    failed
  });
};
