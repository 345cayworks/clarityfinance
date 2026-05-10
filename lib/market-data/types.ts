export type HistoricalPriceResult = {
  ticker: string;
  requestedDate: string;
  referenceDate: string;
  closePrice: number;
};

export type CurrentPriceResult = {
  ticker: string;
  price: number;
  referenceDate: string;
};

export type DividendResult = {
  ticker: string;
  exDividendDate: string;
  amount: number;
};

export type DailyAdjustedRecord = {
  ticker: string;
  date: string;
  close: number;
  adjustedClose: number;
  dividendAmount: number;
  splitCoefficient: number;
  source: string;
  raw?: Record<string, unknown> | null;
};

export interface MarketDataProvider {
  getDailyAdjustedSeries(ticker: string): Promise<DailyAdjustedRecord[]>;
  getHistoricalClosePrice(ticker: string, date: string): Promise<HistoricalPriceResult>;
  getCurrentPrice(ticker: string): Promise<CurrentPriceResult>;
  getDividendHistory(ticker: string, startDate: string, endDate: string): Promise<DividendResult[]>;
}

export type MarketDataProviderName = "alpha_vantage" | "massive";

export type DividendYieldSource = "massive" | "alpha_vantage" | "cache";

export type DividendYieldLookupResult = {
  ticker: string;
  companyName: string | null;
  dividendYieldPercent: number | null;
  annualDividendPerShare: number | null;
  currentPrice: number | null;
  payoutFrequency: string | null;
  source: DividendYieldSource;
  raw?: Record<string, unknown> | null;
};

export type DividendYieldLookup = DividendYieldLookupResult;

export interface DividendYieldProvider {
  getDividendYield(ticker: string): Promise<DividendYieldLookup>;
}
