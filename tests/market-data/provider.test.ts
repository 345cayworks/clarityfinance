import { afterEach, describe, expect, it, vi } from "vitest";

const aggregatePayload = {
  status: "OK",
  results: [
    { t: Date.parse("2024-01-02T00:00:00Z"), c: 100 },
    { t: Date.parse("2024-01-03T00:00:00Z"), c: 110 }
  ]
};

const dividendPayload = {
  status: "OK",
  results: [
    { ticker: "AAPL", ex_dividend_date: "2024-01-03", cash_amount: 0.25, split_adjusted_cash_amount: 0.25, frequency: 4, distribution_type: "recurring" },
    { ticker: "AAPL", ex_dividend_date: "2023-10-03", cash_amount: 0.25, split_adjusted_cash_amount: 0.25, frequency: 4, distribution_type: "recurring" },
    { ticker: "AAPL", ex_dividend_date: "2023-07-03", cash_amount: 0.25, split_adjusted_cash_amount: 0.25, frequency: 4, distribution_type: "recurring" },
    { ticker: "AAPL", ex_dividend_date: "2023-04-03", cash_amount: 0.25, split_adjusted_cash_amount: 0.25, frequency: 4, distribution_type: "recurring" }
  ]
};

function mockJsonResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(payload)
  } as Response);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("market data provider selection", () => {
  it("defaults to Alpha Vantage when MARKET_DATA_PROVIDER is missing", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "");
    const { getConfiguredMarketDataProviderName, getMarketDataProvider } = await import("@/lib/market-data/provider");

    expect(getConfiguredMarketDataProviderName()).toBe("alpha_vantage");
    expect(getMarketDataProvider().constructor.name).toBe("AlphaVantageProvider");
  });

  it("uses MassiveProvider when MARKET_DATA_PROVIDER=massive", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "massive");
    const { getConfiguredMarketDataProviderName, getMarketDataProvider } = await import("@/lib/market-data/provider");

    expect(getConfiguredMarketDataProviderName()).toBe("massive");
    expect(getMarketDataProvider().constructor.name).toBe("MassiveProvider");
  });
});

describe("dividend yield provider selection", () => {
  it("uses Massive when MARKET_DATA_PROVIDER=massive", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "massive");
    vi.stubEnv("MASSIVE_API_KEY", "massive-key");
    const { getConfiguredDividendYieldProviderName, getDividendYieldProvider } = await import("@/lib/market-data/dividend-yield-provider");

    expect(getConfiguredDividendYieldProviderName()).toBe("massive");
    expect(getDividendYieldProvider().constructor.name).toBe("MassiveDividendYieldProvider");
  });

  it("uses Alpha Vantage when MARKET_DATA_PROVIDER=alpha_vantage", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "alpha_vantage");
    vi.stubEnv("ALPHA_VANTAGE_API_KEY", "alpha-key");
    const { getConfiguredDividendYieldProviderName, getDividendYieldProvider } = await import("@/lib/market-data/dividend-yield-provider");

    expect(getConfiguredDividendYieldProviderName()).toBe("alpha_vantage");
    expect(getDividendYieldProvider().constructor.name).toBe("AlphaVantageDividendYieldProvider");
  });

  it("uses Massive when provider is missing and MASSIVE_API_KEY exists", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "");
    vi.stubEnv("MASSIVE_API_KEY", "massive-key");
    const { getConfiguredDividendYieldProviderName } = await import("@/lib/market-data/dividend-yield-provider");

    expect(getConfiguredDividendYieldProviderName()).toBe("massive");
  });

  it("attempts Alpha Vantage fallback if Massive fails and Alpha Vantage is configured", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "massive");
    vi.stubEnv("MASSIVE_API_KEY", "massive-key");
    vi.stubEnv("ALPHA_VANTAGE_API_KEY", "alpha-key");
    const { MassiveDividendYieldProvider } = await import("@/lib/market-data/massive");
    const { AlphaVantageDividendYieldProvider, lookupDividendYieldWithFallback } = await import("@/lib/market-data/dividend-yield-provider");
    vi.spyOn(MassiveDividendYieldProvider.prototype, "getDividendYield").mockRejectedValue(new Error("MASSIVE unavailable"));
    vi.spyOn(AlphaVantageDividendYieldProvider.prototype, "getDividendYield").mockResolvedValue({
      ticker: "SCHD",
      companyName: "Schwab U.S. Dividend Equity ETF",
      dividendYieldPercent: 3.5,
      annualDividendPerShare: 2.8,
      currentPrice: null,
      payoutFrequency: null,
      source: "alpha_vantage",
      raw: {}
    });

    const result = await lookupDividendYieldWithFallback("schd");

    expect(result.source).toBe("alpha_vantage");
  });

  it("returns friendly configuration error when no provider keys exist", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", "");
    vi.stubEnv("MASSIVE_API_KEY", "");
    vi.stubEnv("ALPHA_VANTAGE_API_KEY", "");
    const { lookupDividendYieldWithFallback } = await import("@/lib/market-data/dividend-yield-provider");

    await expect(lookupDividendYieldWithFallback("SCHD")).rejects.toThrow("Market data provider is not configured. Please enter values manually.");
  });

  it("converts Alpha Vantage DividendYield 0.0345 to 3.45", async () => {
    vi.stubEnv("ALPHA_VANTAGE_API_KEY", "alpha-key");
    vi.stubGlobal("fetch", vi.fn(() => mockJsonResponse({
      Symbol: "SCHD",
      Name: "Schwab U.S. Dividend Equity ETF",
      DividendYield: "0.0345",
      DividendPerShare: "2.8"
    })));
    const { AlphaVantageDividendYieldProvider } = await import("@/lib/market-data/dividend-yield-provider");

    const result = await new AlphaVantageDividendYieldProvider().getDividendYield("schd");

    expect(result.dividendYieldPercent).toBeCloseTo(3.45);
    expect(JSON.stringify(result)).not.toContain("alpha-key");
  });
});

describe("MassiveProvider", () => {
  it("normalizes ticker symbols", async () => {
    const { normalizeMassiveTicker } = await import("@/lib/market-data/massive");

    expect(normalizeMassiveTicker(" aa pl ")).toBe("AAPL");
  });

  it("maps historical records to DailyAdjustedRecord shape", async () => {
    vi.stubEnv("MASSIVE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url.includes("/stocks/v1/dividends")) return mockJsonResponse(dividendPayload);
      return mockJsonResponse(aggregatePayload);
    }));
    const { MassiveProvider } = await import("@/lib/market-data/massive");

    const series = await new MassiveProvider().getDailyAdjustedSeries("aapl");

    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      ticker: "AAPL",
      date: "2024-01-02",
      close: 100,
      adjustedClose: 100,
      dividendAmount: 0,
      splitCoefficient: 1,
      source: "massive"
    });
    expect(series[1]?.dividendAmount).toBe(0.25);
  });

  it("calculates dividend yield when the provider returns dividends and current price", async () => {
    vi.stubEnv("MASSIVE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url.includes("/v3/reference/tickers/")) return mockJsonResponse({ status: "OK", results: { ticker: "AAPL", name: "Apple Inc." } });
      if (url.includes("/stocks/v1/dividends")) return mockJsonResponse(dividendPayload);
      return mockJsonResponse(aggregatePayload);
    }));
    const { MassiveProvider } = await import("@/lib/market-data/massive");

    const result = await new MassiveProvider().getDividendYield("aapl");

    expect(result.ticker).toBe("AAPL");
    expect(result.companyName).toBe("Apple Inc.");
    expect(result.annualDividendPerShare).toBe(1);
    expect(result.currentPrice).toBe(110);
    expect(result.dividendYieldPercent).toBeCloseTo((1 / 110) * 100);
    expect(result.source).toBe("massive");
  });
});

describe("investment analyzer provider-independent records", () => {
  it("works with provider-independent DailyAdjustedRecord data", async () => {
    vi.doMock("@/lib/market-data/historical-market-data", () => ({
      normalizeTicker: (ticker: string) => ticker.trim().toUpperCase(),
      findReferenceTradingDay: (series: Array<{ date: string }>, requestedDate: string) => series.find((record) => record.date >= requestedDate) ?? null,
      getLatestTradingDay: (series: unknown[]) => series[series.length - 1] ?? null,
      sumDividendsBetweenDates: (series: Array<{ date: string; dividendAmount: number }>, startDate: string, endDate: string) =>
        series.filter((record) => record.date >= startDate && record.date <= endDate).reduce((sum, record) => sum + record.dividendAmount, 0),
      getOrRefreshDailyAdjustedSeries: async () => ({
        ticker: "AAPL",
        cacheStatus: "refreshed",
        warning: null,
        series: [
          { ticker: "AAPL", date: "2020-01-02", close: 50, adjustedClose: 45, dividendAmount: 0, splitCoefficient: 1, source: "massive" },
          { ticker: "AAPL", date: "2024-01-02", close: 100, adjustedClose: 90, dividendAmount: 1, splitCoefficient: 1, source: "massive" }
        ]
      })
    }));
    const { analyzeInvestmentBasket } = await import("@/lib/market-data/investment-analyzer");

    const result = await analyzeInvestmentBasket({ tickers: ["aapl"], historicalDate: "2020-01-01", spendAmount: 1000 }, "2024-01-03");

    expect(result.positions[0]?.status).toBe("analyzed");
    expect(result.positions[0]?.historicalClosePrice).toBe(45);
    expect(result.positions[0]?.currentPrice).toBe(90);
    expect(result.positions[0]?.estimatedDividends).toBe(22);
    expect(result.positions[0]?.dataSource).toBe("massive");
  });

  it("returns friendly errors without exposing provider secret names", async () => {
    vi.doMock("@/lib/market-data/historical-market-data", () => ({
      normalizeTicker: (ticker: string) => ticker.trim().toUpperCase(),
      findReferenceTradingDay: () => null,
      getLatestTradingDay: () => null,
      sumDividendsBetweenDates: () => 0,
      getOrRefreshDailyAdjustedSeries: async () => {
        throw new Error("MASSIVE_API_KEY is not configured.");
      }
    }));
    const { analyzeInvestmentBasket } = await import("@/lib/market-data/investment-analyzer");

    const result = await analyzeInvestmentBasket({ tickers: ["aapl"], historicalDate: "2020-01-01", spendAmount: 1000 }, "2024-01-03");

    expect(result.positions[0]?.status).toBe("failed");
    expect(result.positions[0]?.error).toContain("Market data unavailable");
    expect(result.positions[0]?.error).not.toContain("MASSIVE_API_KEY");
  });
});
