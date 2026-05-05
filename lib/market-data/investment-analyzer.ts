import type { MarketDataProvider } from "./types";

export type InvestmentAnalysisRequest = {
  tickers: string[];
  historicalDate: string;
  spendAmount: number;
};

export type InvestmentPosition = {
  ticker: string;
  allocationAmount: number;
  requestedDate: string;
  referenceDateUsed: string | null;
  historicalClosePrice: number | null;
  sharesPurchased: number;
  amountInvested: number;
  leftoverCash: number;
  currentPrice: number | null;
  currentPriceDate: string | null;
  currentShareValue: number;
  estimatedDividends: number;
  totalCurrentValue: number;
  gainLoss: number;
  returnPercent: number;
  status: "analyzed" | "failed";
  warnings: string[];
  error: string | null;
};

export type InvestmentSummary = {
  originalSpendAmount: number;
  requestedAllocationTotal: number;
  successfullyAnalyzedAllocationTotal: number;
  totalAmountInvested: number;
  totalLeftoverCash: number;
  currentShareValue: number;
  estimatedDividendsReceived: number;
  totalCurrentPortfolioValue: number;
  totalGainLoss: number;
  totalReturnPercent: number;
};

export type InvestmentAnalysisResponse = {
  summary: InvestmentSummary;
  positions: InvestmentPosition[];
  assumptions: string[];
  warnings: string[];
};

const assumptions = [
  "Equal allocation across all selected tickers.",
  "Whole shares only.",
  "Historical reference price uses the selected date or the next available trading day.",
  "Dividends/distributions are added as cash and not reinvested.",
  "Taxes, fees, and inflation are not included.",
  "Results are for education and planning purposes only, not investment advice."
];

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeTickerInput(tickers: string[]) {
  const normalized: string[] = [];
  for (const rawTicker of tickers) {
    const ticker = rawTicker.trim().replace(/\s+/g, "").toUpperCase();
    if (ticker && !normalized.includes(ticker)) normalized.push(ticker);
  }
  return normalized;
}

export function validateInvestmentAnalysisRequest(input: InvestmentAnalysisRequest): string[] {
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  if (input.tickers.length === 0) errors.push("Enter at least one ticker.");
  if (input.tickers.length > 5) errors.push("Enter no more than 5 tickers.");
  if (!input.historicalDate) errors.push("Choose a historical investment date.");
  if (input.historicalDate >= today) errors.push("Choose a date before today.");
  if (!Number.isFinite(input.spendAmount) || input.spendAmount <= 0) errors.push("Enter a spend amount greater than $0.");
  return errors;
}

export async function analyzeInvestmentBasket(
  request: InvestmentAnalysisRequest,
  provider: MarketDataProvider,
  today = new Date().toISOString().slice(0, 10)
): Promise<InvestmentAnalysisResponse> {
  const tickers = normalizeTickerInput(request.tickers);
  const allocationAmount = request.spendAmount / Math.max(tickers.length, 1);
  const warnings: string[] = [];

  const positions = await Promise.all(
    tickers.map(async (ticker): Promise<InvestmentPosition> => {
      try {
        const historical = await provider.getHistoricalClosePrice(ticker, request.historicalDate);
        const current = await provider.getCurrentPrice(ticker);
        const dividends = await provider.getDividendHistory(ticker, historical.referenceDate, today);
        const totalDividendPerShare = dividends.reduce((sum, dividend) => sum + dividend.amount, 0);
        const sharesPurchased = Math.floor(allocationAmount / historical.closePrice);
        const amountInvested = roundMoney(sharesPurchased * historical.closePrice);
        const leftoverCash = roundMoney(allocationAmount - amountInvested);
        const currentShareValue = roundMoney(sharesPurchased * current.price);
        const estimatedDividends = roundMoney(sharesPurchased * totalDividendPerShare);
        const totalCurrentValue = roundMoney(currentShareValue + estimatedDividends + leftoverCash);
        const gainLoss = roundMoney(totalCurrentValue - allocationAmount);
        const returnPercent = allocationAmount > 0 ? roundPercent((gainLoss / allocationAmount) * 100) : 0;
        const positionWarnings: string[] = [];

        if (historical.referenceDate !== request.historicalDate) {
          positionWarnings.push(`Selected date was not a trading day; used ${historical.referenceDate}.`);
        }
        if (sharesPurchased === 0) {
          positionWarnings.push("Allocation was lower than the historical share price, so zero shares were purchased.");
        }
        if (dividends.length === 0) {
          positionWarnings.push("Dividend data unavailable or no dividends found.");
        }

        warnings.push(...positionWarnings.map((message) => `${ticker}: ${message}`));

        return {
          ticker,
          allocationAmount: roundMoney(allocationAmount),
          requestedDate: request.historicalDate,
          referenceDateUsed: historical.referenceDate,
          historicalClosePrice: roundMoney(historical.closePrice),
          sharesPurchased,
          amountInvested,
          leftoverCash,
          currentPrice: roundMoney(current.price),
          currentPriceDate: current.referenceDate,
          currentShareValue,
          estimatedDividends,
          totalCurrentValue,
          gainLoss,
          returnPercent,
          status: "analyzed",
          warnings: positionWarnings,
          error: null
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to analyze this ticker.";
        warnings.push(`${ticker}: ${message}`);
        return {
          ticker,
          allocationAmount: roundMoney(allocationAmount),
          requestedDate: request.historicalDate,
          referenceDateUsed: null,
          historicalClosePrice: null,
          sharesPurchased: 0,
          amountInvested: 0,
          leftoverCash: 0,
          currentPrice: null,
          currentPriceDate: null,
          currentShareValue: 0,
          estimatedDividends: 0,
          totalCurrentValue: 0,
          gainLoss: 0,
          returnPercent: 0,
          status: "failed",
          warnings: [],
          error: message
        };
      }
    })
  );

  const analyzedPositions = positions.filter((position) => position.status === "analyzed");
  const requestedAllocationTotal = roundMoney(request.spendAmount);
  const successfullyAnalyzedAllocationTotal = roundMoney(analyzedPositions.reduce((sum, position) => sum + position.allocationAmount, 0));
  const totalAmountInvested = roundMoney(analyzedPositions.reduce((sum, position) => sum + position.amountInvested, 0));
  const totalLeftoverCash = roundMoney(analyzedPositions.reduce((sum, position) => sum + position.leftoverCash, 0));
  const currentShareValue = roundMoney(analyzedPositions.reduce((sum, position) => sum + position.currentShareValue, 0));
  const estimatedDividendsReceived = roundMoney(analyzedPositions.reduce((sum, position) => sum + position.estimatedDividends, 0));
  const totalCurrentPortfolioValue = roundMoney(analyzedPositions.reduce((sum, position) => sum + position.totalCurrentValue, 0));
  const totalGainLoss = roundMoney(totalCurrentPortfolioValue - successfullyAnalyzedAllocationTotal);
  const totalReturnPercent = successfullyAnalyzedAllocationTotal > 0 ? roundPercent((totalGainLoss / successfullyAnalyzedAllocationTotal) * 100) : 0;

  return {
    summary: {
      originalSpendAmount: roundMoney(request.spendAmount),
      requestedAllocationTotal,
      successfullyAnalyzedAllocationTotal,
      totalAmountInvested,
      totalLeftoverCash,
      currentShareValue,
      estimatedDividendsReceived,
      totalCurrentPortfolioValue,
      totalGainLoss,
      totalReturnPercent
    },
    positions,
    assumptions,
    warnings
  };
}
