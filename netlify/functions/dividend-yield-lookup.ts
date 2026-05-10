import type { Handler } from "@netlify/functions";
import {
  getDividendYieldProviderSourceLabel,
  lookupDividendYieldWithFallback,
  sanitizeDividendYieldError
} from "../../lib/market-data/dividend-yield-provider";
import { requirePremiumOrStaff } from "./_access";
import {
  cacheRowToResult,
  ensureDividendYieldCacheTable,
  getYieldCacheRow,
  isFreshCache,
  isValidYieldTicker,
  normalizeYieldTicker,
  upsertYieldCache
} from "./_dividend_yield_cache";
import { json } from "./_utils";

const MANUAL_ENTRY_MESSAGE = "Dividend yield unavailable. Please enter it manually.";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requirePremiumOrStaff(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const ticker = normalizeYieldTicker(String(event.queryStringParameters?.ticker ?? ""));
  if (!ticker || !isValidYieldTicker(ticker)) return json(400, { error: "Enter a valid ticker." });

  await ensureDividendYieldCacheTable();
  const cached = await getYieldCacheRow(ticker);
  if (cached && isFreshCache(cached)) {
    return json(200, {
      success: true,
      result: cacheRowToResult(cached, "cached"),
      message: "Yield loaded from cache."
    });
  }

  try {
    const providerResult = await lookupDividendYieldWithFallback(ticker);
    const saved = await upsertYieldCache({ ...providerResult, ticker });
    const result = {
      ...cacheRowToResult(saved, "cached"),
      source: saved.source,
      status: "refreshed"
    };
    return json(200, {
      success: true,
      result,
      message: `Yield loaded from ${getDividendYieldProviderSourceLabel(result.source)}.`
    });
  } catch (error) {
    console.error("dividend-yield-lookup provider failed", { ticker, name: error instanceof Error ? error.name : "UnknownError" });
    if (cached) {
      return json(200, {
        success: true,
        warning: "Using previously cached yield. Please verify.",
        result: cacheRowToResult(cached, "stale")
      });
    }

    return json(503, {
      success: false,
      error: sanitizeDividendYieldError(error),
      message: MANUAL_ENTRY_MESSAGE
    });
  }
};
