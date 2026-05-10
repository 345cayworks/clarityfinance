import type {
  CurrentPriceResult,
  DailyAdjustedRecord,
  DividendResult,
  DividendYieldLookup,
  DividendYieldProvider,
  HistoricalPriceResult,
  MarketDataProvider
} from "./types";

type MassiveAggregate = {
  t?: number;
  c?: number;
  o?: number;
  h?: number;
  l?: number;
  v?: number;
};

type MassiveAggregatesResponse = {
  results?: MassiveAggregate[];
  status?: string;
  error?: string;
  message?: string;
  request_id?: string;
};

type MassiveDividend = {
  ticker?: string;
  cash_amount?: number;
  split_adjusted_cash_amount?: number;
  ex_dividend_date?: string;
  frequency?: number;
  distribution_type?: string;
};

type MassiveDividendsResponse = {
  results?: MassiveDividend[];
  status?: string;
  error?: string;
  message?: string;
  request_id?: string;
};

type MassiveTickerDetailsResponse = {
  results?: {
    ticker?: string;
    name?: string;
    branding?: unknown;
  };
  status?: string;
  error?: string;
  message?: string;
  request_id?: string;
};

const API_URL = "https://api.massive.com";
const UNAVAILABLE_MESSAGE = "Market data unavailable. Please try again later or enter values manually.";
const ADJUSTED_CLOSE_WARNING = "MASSIVE daily aggregates are requested adjusted, but dividend-adjusted close is not guaranteed; close is used as adjustedClose when no separate adjusted value is available.";

function getApiKey() {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY is not configured.");
  return key;
}

export function normalizeMassiveTicker(ticker: string) {
  return ticker.trim().replace(/\s+/g, "").toUpperCase();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toDate(value: number | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function getProviderError(payload: { status?: string; error?: string; message?: string }) {
  const raw = payload.error ?? payload.message;
  if (!raw && (!payload.status || payload.status.toUpperCase() === "OK")) return null;
  if (raw?.toLowerCase().includes("api key")) return "MASSIVE rejected the API key. Check MASSIVE_API_KEY.";
  return UNAVAILABLE_MESSAGE;
}

async function requestJson<T>(path: string, params: Record<string, string>) {
  const query = new URLSearchParams({ ...params, apiKey: getApiKey() });
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}?${query.toString()}`);
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  if (!response.ok) throw new Error(UNAVAILABLE_MESSAGE);
  const payload = await response.json() as T & { status?: string; error?: string; message?: string };
  const providerError = getProviderError(payload);
  if (providerError) throw new Error(providerError);
  return payload;
}

function dividendAmountForDate(dividends: MassiveDividend[], date: string) {
  return dividends
    .filter((dividend) => dividend.ex_dividend_date === date)
    .reduce((sum, dividend) => sum + toNumber(dividend.split_adjusted_cash_amount ?? dividend.cash_amount), 0);
}

function annualDividendFromRecent(dividends: MassiveDividend[]) {
  const recurring = dividends
    .filter((dividend) => dividend.distribution_type !== "special" && dividend.distribution_type !== "irregular")
    .sort((a, b) => String(b.ex_dividend_date ?? "").localeCompare(String(a.ex_dividend_date ?? "")));
  const latest = recurring[0] ?? dividends[0];
  if (!latest) return { annualDividendPerShare: null, payoutFrequency: null };

  const latestDate = new Date(String(latest.ex_dividend_date));
  if (!Number.isNaN(latestDate.getTime())) {
    const trailingStart = new Date(latestDate);
    trailingStart.setFullYear(trailingStart.getFullYear() - 1);
    const trailingTwelveMonthDividends = recurring
      .filter((dividend) => {
        const date = new Date(String(dividend.ex_dividend_date));
        return !Number.isNaN(date.getTime()) && date > trailingStart && date <= latestDate;
      })
      .reduce((sum, dividend) => sum + toNumber(dividend.split_adjusted_cash_amount ?? dividend.cash_amount), 0);
    if (trailingTwelveMonthDividends > 0) {
      return {
        annualDividendPerShare: trailingTwelveMonthDividends,
        payoutFrequency: latest.frequency ? String(latest.frequency) : null
      };
    }
  }

  const cashAmount = toNumber(latest.split_adjusted_cash_amount ?? latest.cash_amount);
  const frequency = toNumber(latest.frequency);
  if (cashAmount <= 0 || frequency <= 0) return { annualDividendPerShare: null, payoutFrequency: null };

  return {
    annualDividendPerShare: cashAmount * frequency,
    payoutFrequency: String(frequency)
  };
}

async function fetchDividends(ticker: string) {
  const payload = await requestJson<MassiveDividendsResponse>("/stocks/v1/dividends", {
    ticker,
    limit: "5000"
  });
  return (payload.results ?? []).filter((dividend) => dividend.ex_dividend_date);
}

export class MassiveProvider implements MarketDataProvider, DividendYieldProvider {
  async getDailyAdjustedSeries(ticker: string): Promise<DailyAdjustedRecord[]> {
    const normalizedTicker = normalizeMassiveTicker(ticker);
    const [aggregatesPayload, dividends] = await Promise.all([
      requestJson<MassiveAggregatesResponse>(`/v2/aggs/ticker/${encodeURIComponent(normalizedTicker)}/range/1/day/1970-01-01/${currentDate()}`, {
        adjusted: "true",
        sort: "asc",
        limit: "50000"
      }),
      fetchDividends(normalizedTicker).catch(() => [] as MassiveDividend[])
    ]);

    const records: DailyAdjustedRecord[] = [];
    for (const row of aggregatesPayload.results ?? []) {
        const date = toDate(row.t);
        const close = toNumber(row.c, NaN);
        if (!date || !Number.isFinite(close) || close <= 0) continue;
        records.push({
          ticker: normalizedTicker,
          date,
          close,
          adjustedClose: close,
          dividendAmount: dividendAmountForDate(dividends, date),
          splitCoefficient: 1,
          source: "massive",
          raw: {
            aggregate: row,
            dividend: dividends.filter((dividend) => dividend.ex_dividend_date === date),
            warning: ADJUSTED_CLOSE_WARNING
          }
        });
    }
    records.sort((a, b) => a.date.localeCompare(b.date));

    if (records.length === 0) throw new Error(UNAVAILABLE_MESSAGE);
    return records;
  }

  async getHistoricalClosePrice(ticker: string, date: string): Promise<HistoricalPriceResult> {
    const normalizedTicker = normalizeMassiveTicker(ticker);
    const series = await this.getDailyAdjustedSeries(normalizedTicker);
    const referenceRecord = series.find((record) => record.date >= date);
    if (!referenceRecord) throw new Error(UNAVAILABLE_MESSAGE);
    return {
      ticker: normalizedTicker,
      requestedDate: date,
      referenceDate: referenceRecord.date,
      closePrice: referenceRecord.adjustedClose || referenceRecord.close
    };
  }

  async getCurrentPrice(ticker: string): Promise<CurrentPriceResult> {
    const normalizedTicker = normalizeMassiveTicker(ticker);
    const series = await this.getDailyAdjustedSeries(normalizedTicker);
    const latestRecord = series[series.length - 1];
    if (!latestRecord) throw new Error(UNAVAILABLE_MESSAGE);
    return {
      ticker: normalizedTicker,
      price: latestRecord.adjustedClose || latestRecord.close,
      referenceDate: latestRecord.date
    };
  }

  async getDividendHistory(ticker: string, startDate: string, endDate: string): Promise<DividendResult[]> {
    const normalizedTicker = normalizeMassiveTicker(ticker);
    const dividends = await fetchDividends(normalizedTicker);
    return dividends
      .filter((dividend) => String(dividend.ex_dividend_date ?? "") >= startDate && String(dividend.ex_dividend_date ?? "") <= endDate)
      .map((dividend) => ({
        ticker: normalizedTicker,
        exDividendDate: String(dividend.ex_dividend_date),
        amount: toNumber(dividend.split_adjusted_cash_amount ?? dividend.cash_amount)
      }))
      .filter((dividend) => dividend.amount > 0);
  }

  async getDividendYield(ticker: string): Promise<DividendYieldLookup> {
    const normalizedTicker = normalizeMassiveTicker(ticker);
    const [detailsPayload, currentPrice, dividends] = await Promise.all([
      requestJson<MassiveTickerDetailsResponse>(`/v3/reference/tickers/${encodeURIComponent(normalizedTicker)}`, {}),
      this.getCurrentPrice(normalizedTicker),
      fetchDividends(normalizedTicker)
    ]);
    const { annualDividendPerShare, payoutFrequency } = annualDividendFromRecent(dividends);
    const dividendYieldPercent =
      annualDividendPerShare !== null && currentPrice.price > 0
        ? (annualDividendPerShare / currentPrice.price) * 100
        : null;

    if (dividendYieldPercent === null && annualDividendPerShare === null) throw new Error(UNAVAILABLE_MESSAGE);

    return {
      ticker: normalizeMassiveTicker(detailsPayload.results?.ticker ?? normalizedTicker),
      companyName: detailsPayload.results?.name ?? null,
      dividendYieldPercent,
      annualDividendPerShare,
      currentPrice: currentPrice.price,
      payoutFrequency,
      source: "massive",
      raw: {
        details: detailsPayload,
        dividends,
        currentPrice,
        yieldCalculation: "trailing twelve month dividends / currentPrice * 100"
      }
    };
  }
}

export class MassiveDividendYieldProvider extends MassiveProvider {}
