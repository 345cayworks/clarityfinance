import { AlphaVantageProvider } from "./alpha-vantage";
import { MassiveProvider } from "./massive";
import type { MarketDataProvider } from "./types";

export function getConfiguredMarketDataProviderName() {
  if (process.env.MARKET_DATA_PROVIDER === "massive") return "massive";
  if (process.env.MARKET_DATA_PROVIDER === "alpha_vantage") return "alpha_vantage";
  if (process.env.MASSIVE_API_KEY) return "massive";
  return "alpha_vantage";
}

export function getMarketDataProvider(): MarketDataProvider {
  if (getConfiguredMarketDataProviderName() === "massive") return new MassiveProvider();
  return new AlphaVantageProvider();
}
