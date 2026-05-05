import { AlphaVantageProvider } from "./alpha-vantage";
import type { MarketDataProvider } from "./types";

export function getMarketDataProvider(): MarketDataProvider {
  return new AlphaVantageProvider();
}

