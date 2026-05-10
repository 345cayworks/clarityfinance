import { MassiveDividendYieldProvider } from "./massive";
import type { DividendYieldLookup, DividendYieldProvider } from "./types";

export type { DividendYieldLookup, DividendYieldProvider } from "./types";

type AlphaVantageOverviewResponse = {
  Symbol?: string;
  Name?: string;
  DividendYield?: string;
  DividendPerShare?: string;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

const API_URL = "https://www.alphavantage.co/query";
const UNAVAILABLE_MESSAGE = "Dividend yield unavailable. Please enter it manually.";
export const PROVIDER_NOT_CONFIGURED_MESSAGE = "Market data provider is not configured. Please enter values manually.";

function getApiKey() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not configured.");
  return key;
}

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function parseNullableNumber(value: string | undefined) {
  if (!value || value === "None" || value === "-") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDividendYieldPercent(value: string | undefined) {
  const numeric = parseNullableNumber(value);
  if (numeric === null) return null;
  return numeric <= 1 ? numeric * 100 : numeric;
}

function getProviderError(payload: AlphaVantageOverviewResponse) {
  const message = payload.Note ?? payload.Information ?? payload["Error Message"];
  if (!message) return null;
  if (payload["Error Message"]) return "Alpha Vantage could not find dividend data for this ticker.";
  return UNAVAILABLE_MESSAGE;
}

export class AlphaVantageDividendYieldProvider implements DividendYieldProvider {
  async getDividendYield(ticker: string): Promise<DividendYieldLookup> {
    const normalizedTicker = normalizeTicker(ticker);
    const query = new URLSearchParams({
      function: "OVERVIEW",
      symbol: normalizedTicker,
      apikey: getApiKey()
    });

    let response: Response;
    try {
      response = await fetch(`${API_URL}?${query.toString()}`);
    } catch {
      throw new Error(UNAVAILABLE_MESSAGE);
    }

    if (!response.ok) throw new Error(UNAVAILABLE_MESSAGE);

    const payload = await response.json() as AlphaVantageOverviewResponse;
    const providerError = getProviderError(payload);
    if (providerError) throw new Error(providerError);

    const dividendYieldPercent = parseDividendYieldPercent(payload.DividendYield);
    const annualDividendPerShare = parseNullableNumber(payload.DividendPerShare);
    if (dividendYieldPercent === null && annualDividendPerShare === null) throw new Error(UNAVAILABLE_MESSAGE);

    return {
      ticker: normalizeTicker(payload.Symbol ?? normalizedTicker),
      companyName: payload.Name ?? null,
      dividendYieldPercent,
      annualDividendPerShare,
      currentPrice: null,
      payoutFrequency: null,
      source: "alpha_vantage",
      raw: payload as Record<string, unknown>
    };
  }
}

export class FutureProvider implements DividendYieldProvider {
  async getDividendYield(): Promise<DividendYieldLookup> {
    throw new Error("Future dividend yield provider is not implemented yet.");
  }
}

export function getConfiguredDividendYieldProviderName() {
  if (process.env.MARKET_DATA_PROVIDER === "massive") return "massive";
  if (process.env.MARKET_DATA_PROVIDER === "alpha_vantage") return "alpha_vantage";
  if (process.env.MASSIVE_API_KEY) return "massive";
  if (process.env.ALPHA_VANTAGE_API_KEY) return "alpha_vantage";
  return null;
}

export function getDividendYieldProvider(): DividendYieldProvider {
  const providerName = getConfiguredDividendYieldProviderName();
  if (providerName === "massive") return new MassiveDividendYieldProvider();
  if (providerName === "alpha_vantage") return new AlphaVantageDividendYieldProvider();
  throw new Error(PROVIDER_NOT_CONFIGURED_MESSAGE);
}

export function getDividendYieldProviderFallbackOrder() {
  const configured = getConfiguredDividendYieldProviderName();
  if (configured === "massive") {
    return [
      { name: "massive" as const, provider: new MassiveDividendYieldProvider(), configured: Boolean(process.env.MASSIVE_API_KEY) },
      { name: "alpha_vantage" as const, provider: new AlphaVantageDividendYieldProvider(), configured: Boolean(process.env.ALPHA_VANTAGE_API_KEY) }
    ].filter((entry) => entry.configured);
  }
  if (configured === "alpha_vantage") {
    return [
      { name: "alpha_vantage" as const, provider: new AlphaVantageDividendYieldProvider(), configured: Boolean(process.env.ALPHA_VANTAGE_API_KEY) },
      { name: "massive" as const, provider: new MassiveDividendYieldProvider(), configured: Boolean(process.env.MASSIVE_API_KEY) }
    ].filter((entry) => entry.configured);
  }
  return [];
}

export async function lookupDividendYieldWithFallback(ticker: string): Promise<DividendYieldLookup> {
  const providers = getDividendYieldProviderFallbackOrder();
  if (providers.length === 0) throw new Error(PROVIDER_NOT_CONFIGURED_MESSAGE);

  for (const entry of providers) {
    try {
      return await entry.provider.getDividendYield(ticker);
    } catch {
      continue;
    }
  }

  throw new Error(UNAVAILABLE_MESSAGE);
}

export function getDividendYieldProviderSourceLabel(source: string | null | undefined) {
  if (source === "massive") return "MASSIVE";
  if (source === "alpha_vantage") return "Alpha Vantage";
  if (source === "cache") return "cache";
  return "provider";
}

export function sanitizeDividendYieldError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === PROVIDER_NOT_CONFIGURED_MESSAGE) return PROVIDER_NOT_CONFIGURED_MESSAGE;
  return UNAVAILABLE_MESSAGE;
}

export function getLegacyDividendYieldProvider(): DividendYieldProvider {
  return new AlphaVantageDividendYieldProvider();
}
