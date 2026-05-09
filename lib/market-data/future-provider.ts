import type { CurrentPriceResult, DailyAdjustedRecord, DividendResult, HistoricalPriceResult, MarketDataProvider } from "./types";

export class FutureProvider implements MarketDataProvider {
  async getDailyAdjustedSeries(): Promise<DailyAdjustedRecord[]> {
    throw new Error("Future market data provider is not implemented yet.");
  }

  async getHistoricalClosePrice(): Promise<HistoricalPriceResult> {
    throw new Error("Future market data provider is not implemented yet.");
  }

  async getCurrentPrice(): Promise<CurrentPriceResult> {
    throw new Error("Future market data provider is not implemented yet.");
  }

  async getDividendHistory(): Promise<DividendResult[]> {
    throw new Error("Future market data provider is not implemented yet.");
  }
}
