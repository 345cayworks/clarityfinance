export type DividendYieldLookup = {
  ticker: string;
  companyName: string | null;
  dividendYieldPercent: number | null;
  annualDividendPerShare: number | null;
  payoutFrequency: string | null;
  source: string;
  raw: Record<string, unknown> | null;
};

export interface DividendYieldProvider {
  getDividendYield(ticker: string): Promise<DividendYieldLookup>;
}

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

export function getDividendYieldProvider(): DividendYieldProvider {
  return new AlphaVantageDividendYieldProvider();
}
