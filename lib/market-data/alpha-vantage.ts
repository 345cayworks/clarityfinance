import type { CurrentPriceResult, DividendResult, HistoricalPriceResult, MarketDataProvider } from "./types";

type AlphaVantageSeriesRow = {
  "4. close"?: string;
  "5. adjusted close"?: string;
};

type AlphaVantageTimeSeriesResponse = {
  "Time Series (Daily)"?: Record<string, AlphaVantageSeriesRow>;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

type AlphaVantageDividendResponse = {
  data?: Array<{
    ex_dividend_date?: string;
    declaration_date?: string;
    record_date?: string;
    payment_date?: string;
    amount?: string;
  }>;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const API_URL = "https://www.alphavantage.co/query";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached || cached.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.value as T;
}

function setCached<T>(key: string, value: T): T {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

function toMessage(payload: AlphaVantageTimeSeriesResponse | AlphaVantageDividendResponse) {
  const rawMessage = payload.Note ?? payload.Information ?? payload["Error Message"];
  if (!rawMessage) return null;
  const message = rawMessage.toLowerCase();
  if (message.includes("api key") || message.includes("apikey")) return "Alpha Vantage rejected the API key. Check ALPHA_VANTAGE_API_KEY.";
  if (message.includes("frequency") || message.includes("rate limit") || message.includes("standard api call frequency")) {
    return "Alpha Vantage API quota was reached. Please try again later.";
  }
  if (payload["Error Message"]) return "Alpha Vantage could not find market data for this ticker.";
  return "Alpha Vantage returned a market data notice. Please try again later.";
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isOnOrAfter(date: string, startDate: string) {
  return date >= startDate;
}

function isInRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function getApiKey() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not configured.");
  return key;
}

export class AlphaVantageProvider implements MarketDataProvider {
  private async request<T extends AlphaVantageTimeSeriesResponse | AlphaVantageDividendResponse>(params: Record<string, string>): Promise<T> {
    const query = new URLSearchParams({ ...params, apikey: getApiKey() });
    const url = `${API_URL}?${query.toString()}`;
    const cacheKey = url.replace(getApiKey(), "API_KEY");
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error("Unable to reach Alpha Vantage. Please try again later.");
    }

    if (!response.ok) throw new Error("Alpha Vantage request failed. Please try again later.");

    const payload = (await response.json()) as T;
    const providerMessage = toMessage(payload);
    if (providerMessage) throw new Error(providerMessage);
    return setCached(cacheKey, payload);
  }

  private async getDailyAdjustedSeries(ticker: string, outputsize: "compact" | "full") {
    const payload = await this.request<AlphaVantageTimeSeriesResponse>({
      function: "TIME_SERIES_DAILY_ADJUSTED",
      symbol: ticker,
      outputsize
    });
    const series = payload["Time Series (Daily)"];
    if (!series || typeof series !== "object") throw new Error("Market data is unavailable for this ticker.");
    return series;
  }

  async getHistoricalClosePrice(ticker: string, date: string): Promise<HistoricalPriceResult> {
    const series = await this.getDailyAdjustedSeries(ticker, "full");
    const referenceDate = Object.keys(series).sort().find((candidate) => isOnOrAfter(candidate, date));
    if (!referenceDate) throw new Error("No historical price is available on or after the selected date.");

    const closePrice = parsePositiveNumber(series[referenceDate]?.["5. adjusted close"] ?? series[referenceDate]?.["4. close"]);
    if (!closePrice) throw new Error("Historical close price is missing for this ticker.");

    return { ticker, requestedDate: date, referenceDate, closePrice };
  }

  async getCurrentPrice(ticker: string): Promise<CurrentPriceResult> {
    const series = await this.getDailyAdjustedSeries(ticker, "compact");
    const referenceDate = Object.keys(series).sort().reverse()[0];
    if (!referenceDate) throw new Error("Current price is unavailable for this ticker.");

    const price = parsePositiveNumber(series[referenceDate]?.["5. adjusted close"] ?? series[referenceDate]?.["4. close"]);
    if (!price) throw new Error("Current price is missing for this ticker.");

    return { ticker, price, referenceDate };
  }

  async getDividendHistory(ticker: string, startDate: string, endDate: string): Promise<DividendResult[]> {
    try {
      const payload = await this.request<AlphaVantageDividendResponse>({
        function: "DIVIDENDS",
        symbol: ticker
      });

      if (!Array.isArray(payload.data)) return [];

      return payload.data
        .map((dividend) => {
          const exDividendDate = dividend.ex_dividend_date ?? "";
          const amount = Number(dividend.amount ?? 0);
          return { ticker, exDividendDate, amount };
        })
        .filter((dividend) => dividend.exDividendDate && Number.isFinite(dividend.amount) && dividend.amount > 0)
        .filter((dividend) => isInRange(dividend.exDividendDate, startDate, endDate));
    } catch {
      return [];
    }
  }
}

