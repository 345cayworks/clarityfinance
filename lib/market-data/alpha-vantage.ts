import type { CurrentPriceResult, DailyAdjustedRecord, DividendResult, HistoricalPriceResult, MarketDataProvider } from "./types";

type AlphaVantageSeriesRow = {
  "4. close"?: string;
  "5. adjusted close"?: string;
  "7. dividend amount"?: string;
  "8. split coefficient"?: string;
};

type AlphaVantageTimeSeriesResponse = {
  "Time Series (Daily)"?: Record<string, AlphaVantageSeriesRow>;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: Promise<T>;
};

const API_URL = "https://www.alphavantage.co/query";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const MARKET_DATA_UNAVAILABLE_MESSAGE =
  "Market data is temporarily unavailable or API quota was reached. Try again later or reduce the number of tickers.";
const seriesCache = new Map<string, CacheEntry<DailyAdjustedRecord[]>>();

function getCached<T>(key: string): Promise<T> | null {
  const cached = seriesCache.get(key);
  if (!cached || cached.expiresAt < Date.now()) {
    seriesCache.delete(key);
    return null;
  }
  return cached.value as Promise<T>;
}

function setCached<T>(key: string, value: Promise<T>): Promise<T> {
  seriesCache.set(key, { value: value as Promise<DailyAdjustedRecord[]>, expiresAt: Date.now() + CACHE_TTL_MS });
  value.catch(() => seriesCache.delete(key));
  return value;
}

function getApiKey() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not configured.");
  return key;
}

function getAlphaVantageMessage(payload: AlphaVantageTimeSeriesResponse) {
  const rawMessage = payload.Note ?? payload.Information ?? payload["Error Message"];
  if (!rawMessage) return null;

  const message = rawMessage.toLowerCase();
  if (message.includes("api key") || message.includes("apikey")) {
    return "Alpha Vantage rejected the API key. Check ALPHA_VANTAGE_API_KEY.";
  }
  if (
    message.includes("frequency") ||
    message.includes("rate limit") ||
    message.includes("standard api call frequency") ||
    message.includes("thank you for using alpha vantage")
  ) {
    return MARKET_DATA_UNAVAILABLE_MESSAGE;
  }
  if (payload["Error Message"]) return "Alpha Vantage could not find market data for this ticker.";
  return MARKET_DATA_UNAVAILABLE_MESSAGE;
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveNumber(value: string | undefined): number | null {
  const parsed = parseNumber(value);
  return parsed > 0 ? parsed : null;
}

function isInRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function parseDailyAdjustedSeries(ticker: string, payload: AlphaVantageTimeSeriesResponse): DailyAdjustedRecord[] {
  const series = payload["Time Series (Daily)"];
  if (!series || typeof series !== "object") throw new Error("Market data is unavailable for this ticker.");

  const records = Object.entries(series)
    .map(([date, row]) => {
      const close = parsePositiveNumber(row["4. close"]);
      const adjustedClose = parsePositiveNumber(row["5. adjusted close"]);
      if (!close || !adjustedClose) return null;
      return {
        ticker,
        date,
        close,
        adjustedClose,
        dividendAmount: parseNumber(row["7. dividend amount"]),
        splitCoefficient: parseNumber(row["8. split coefficient"], 1),
        source: "alpha_vantage",
        raw: row as Record<string, unknown>
      };
    })
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (records.length === 0) throw new Error("Market data is unavailable for this ticker.");
  return records;
}

export class AlphaVantageProvider implements MarketDataProvider {
  private async requestDailyAdjustedSeries(ticker: string): Promise<DailyAdjustedRecord[]> {
    const normalizedTicker = ticker.trim().toUpperCase();
    const cacheKey = `daily-adjusted:${normalizedTicker}`;
    const cached = getCached<DailyAdjustedRecord[]>(cacheKey);
    if (cached) return cached;

    const request = (async () => {
      const query = new URLSearchParams({
        function: "TIME_SERIES_DAILY_ADJUSTED",
        symbol: normalizedTicker,
        outputsize: "full",
        apikey: getApiKey()
      });

      let response: Response;
      try {
        response = await fetch(`${API_URL}?${query.toString()}`);
      } catch {
        throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
      }

      if (!response.ok) throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);

      const payload = (await response.json()) as AlphaVantageTimeSeriesResponse;
      const providerMessage = getAlphaVantageMessage(payload);
      if (providerMessage) throw new Error(providerMessage);
      return parseDailyAdjustedSeries(normalizedTicker, payload);
    })();

    return setCached(cacheKey, request);
  }

  async getDailyAdjustedSeries(ticker: string): Promise<DailyAdjustedRecord[]> {
    return this.requestDailyAdjustedSeries(ticker);
  }

  async getHistoricalClosePrice(ticker: string, date: string): Promise<HistoricalPriceResult> {
    const series = await this.getDailyAdjustedSeries(ticker);
    const referenceRecord = series.find((record) => record.date >= date);

    if (!referenceRecord) {
      const firstDate = series[0]?.date;
      const lastDate = series[series.length - 1]?.date;
      if (firstDate && date < firstDate) throw new Error(`No historical price is available before this ticker's first available trading date (${firstDate}).`);
      if (lastDate && date > lastDate) throw new Error("No historical price is available after the latest market data date.");
      throw new Error("No historical price is available on or after the selected date.");
    }

    return {
      ticker,
      requestedDate: date,
      referenceDate: referenceRecord.date,
      closePrice: referenceRecord.adjustedClose
    };
  }

  async getCurrentPrice(ticker: string): Promise<CurrentPriceResult> {
    const series = await this.getDailyAdjustedSeries(ticker);
    const latestRecord = series[series.length - 1];
    if (!latestRecord) throw new Error("Current price is unavailable for this ticker.");

    return {
      ticker,
      price: latestRecord.adjustedClose,
      referenceDate: latestRecord.date
    };
  }

  async getDividendHistory(ticker: string, startDate: string, endDate: string): Promise<DividendResult[]> {
    const series = await this.getDailyAdjustedSeries(ticker);
    return series
      .filter((record) => isInRange(record.date, startDate, endDate))
      .filter((record) => record.dividendAmount > 0)
      .map((record) => ({
        ticker,
        exDividendDate: record.date,
        amount: record.dividendAmount
      }));
  }
}
