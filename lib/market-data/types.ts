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

export interface MarketDataProvider {
  getHistoricalClosePrice(ticker: string, date: string): Promise<HistoricalPriceResult>;
  getCurrentPrice(ticker: string): Promise<CurrentPriceResult>;
  getDividendHistory(ticker: string, startDate: string, endDate: string): Promise<DividendResult[]>;
}

