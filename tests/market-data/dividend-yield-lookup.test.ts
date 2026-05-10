import { afterEach, describe, expect, it, vi } from "vitest";
import type { HandlerResponse } from "@netlify/functions";

const freshCacheRow = {
  ticker: "SCHD",
  company_name: "Schwab U.S. Dividend Equity ETF",
  dividend_yield_percent: 3.4,
  annual_dividend_per_share: 2.8,
  current_price: 82,
  payout_frequency: null,
  source: "massive",
  raw_json: {},
  fetched_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60_000).toISOString()
};

const staleCacheRow = {
  ...freshCacheRow,
  expires_at: new Date(Date.now() - 60_000).toISOString()
};

function event(ticker = " schd ") {
  return {
    httpMethod: "GET",
    queryStringParameters: { ticker },
    headers: {}
  } as never;
}

async function runHandler(handler: (event: never, context: never, callback: never) => unknown) {
  return await handler(event(), {} as never, undefined as never) as HandlerResponse;
}

async function loadHandler(options: {
  accessOk: boolean;
  cached: typeof freshCacheRow | null;
  fresh: boolean;
  providerResult?: unknown;
  providerError?: Error;
}) {
  vi.resetModules();
  vi.doMock("../../netlify/functions/_access", () => ({
    requirePremiumOrStaff: vi.fn(async () => options.accessOk
      ? { ok: true, user: { id: "user_1", email: "p@example.com", role: "premium_user" } }
      : { ok: false, statusCode: 403, body: { error: "Premium, Advisor, or Admin access required." } })
  }));
  vi.doMock("../../netlify/functions/_dividend_yield_cache", () => ({
    normalizeYieldTicker: (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, ""),
    isValidYieldTicker: (value: string) => /^[A-Z0-9.-]{1,12}$/.test(value),
    ensureDividendYieldCacheTable: vi.fn(async () => undefined),
    getYieldCacheRow: vi.fn(async () => options.cached),
    isFreshCache: vi.fn(() => options.fresh),
    cacheRowToResult: vi.fn((row, status) => ({
      ticker: row.ticker,
      companyName: row.company_name,
      dividendYieldPercent: Number(row.dividend_yield_percent),
      annualDividendPerShare: Number(row.annual_dividend_per_share),
      currentPrice: Number(row.current_price),
      source: "cache",
      providerSource: row.source,
      status
    })),
    upsertYieldCache: vi.fn(async (result) => ({
      ...freshCacheRow,
      ticker: result.ticker,
      company_name: result.companyName,
      dividend_yield_percent: result.dividendYieldPercent,
      annual_dividend_per_share: result.annualDividendPerShare,
      current_price: result.currentPrice,
      source: result.source
    }))
  }));
  vi.doMock("../../lib/market-data/dividend-yield-provider", () => ({
    lookupDividendYieldWithFallback: vi.fn(async () => {
      if (options.providerError) throw options.providerError;
      return options.providerResult ?? {
        ticker: "SCHD",
        companyName: "Schwab U.S. Dividend Equity ETF",
        dividendYieldPercent: 3.5,
        annualDividendPerShare: 2.9,
        currentPrice: 83,
        source: "massive",
        raw: {}
      };
    }),
    getDividendYieldProviderSourceLabel: (source: string) => source === "massive" ? "MASSIVE" : source === "alpha_vantage" ? "Alpha Vantage" : "cache",
    sanitizeDividendYieldError: (error: unknown) => error instanceof Error ? error.message : "Dividend yield unavailable. Please enter it manually."
  }));
  return import("../../netlify/functions/dividend-yield-lookup");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("dividend-yield-lookup function", () => {
  it("blocks standard users with 403", async () => {
    const { handler } = await loadHandler({ accessOk: false, cached: null, fresh: false });

    const response = await runHandler(handler);

    expect(response.statusCode).toBe(403);
  });

  it("allows premium users and refreshes provider data", async () => {
    const { handler } = await loadHandler({ accessOk: true, cached: null, fresh: false });

    const response = await runHandler(handler);
    const body = JSON.parse(response.body ?? "{}");

    expect(response.statusCode).toBe(200);
    expect(body.result.ticker).toBe("SCHD");
    expect(body.result.status).toBe("refreshed");
    expect(body.message).toBe("Yield loaded from MASSIVE.");
    expect(JSON.stringify(body)).not.toContain("API_KEY");
  });

  it("returns fresh cache before provider call", async () => {
    const { handler } = await loadHandler({ accessOk: true, cached: freshCacheRow, fresh: true });

    const response = await runHandler(handler);
    const body = JSON.parse(response.body ?? "{}");

    expect(response.statusCode).toBe(200);
    expect(body.result.source).toBe("cache");
    expect(body.result.status).toBe("cached");
    expect(body.message).toBe("Yield loaded from cache.");
  });

  it("returns stale cache if provider fails", async () => {
    const { handler } = await loadHandler({ accessOk: true, cached: staleCacheRow, fresh: false, providerError: new Error("provider failed") });

    const response = await runHandler(handler);
    const body = JSON.parse(response.body ?? "{}");

    expect(response.statusCode).toBe(200);
    expect(body.result.status).toBe("stale");
    expect(body.warning).toBe("Using previously cached yield. Please verify.");
  });

  it("returns friendly error when no provider and no cache exists", async () => {
    const { handler } = await loadHandler({
      accessOk: true,
      cached: null,
      fresh: false,
      providerError: new Error("Market data provider is not configured. Please enter values manually.")
    });

    const response = await runHandler(handler);
    const body = JSON.parse(response.body ?? "{}");

    expect(response.statusCode).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Market data provider is not configured. Please enter values manually.");
    expect(JSON.stringify(body)).not.toContain("API_KEY");
  });
});
