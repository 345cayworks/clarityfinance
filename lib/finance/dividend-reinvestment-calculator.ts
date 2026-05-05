export type DividendPayoutFrequency = "weekly" | "monthly" | "quarterly" | "annually";

export type DividendPositionInput = {
  id: string;
  symbol: string;
  buyPrice: number;
  quantity: number;
  dividendYieldPercent: number;
  payoutFrequency: DividendPayoutFrequency;
  reinvestDividends: boolean;
  projectionYears: number;
};

export type DividendProjectionYear = {
  year: number;
  startingShares: number;
  endingShares: number;
  annualDividendsEarned: number;
  cumulativeDividends: number;
  portfolioValue: number;
  annualDividendIncome: number;
  sharesAdded: number;
};

export type DividendPositionResult = {
  id: string;
  symbol: string;
  buyPrice: number;
  quantity: number;
  dividendYieldPercent: number;
  payoutFrequency: DividendPayoutFrequency;
  startingValue: number;
  annualDividendPerShare: number;
  dividendPerSharePerPeriod: number;
  totalDividendPerPeriod: number;
  annualDividendIncome: number;
  monthlyEquivalentIncome: number;
  projectedShares: number;
  projectedValue: number;
  projectedAnnualDividendIncome: number;
  cumulativeDividends: number;
  sharesAdded: number;
  projection: DividendProjectionYear[];
};

export type ProjectionPoint = {
  year: number;
  portfolioValue: number;
  cumulativeDividends: number;
  annualDividendIncome: number;
  sharesOwned: number;
};

export type DividendBasketSummary = {
  startingPortfolioValue: number;
  currentAnnualDividendIncome: number;
  currentMonthlyEquivalentIncome: number;
  currentPeriodicPayout: number;
  projectedPortfolioValue: number;
  projectedAnnualDividendIncome: number;
  cumulativeDividends: number;
  totalGrowthFromReinvestment: number;
  totalSharesAdded: number;
};

export type DividendBasketResult = {
  positions: DividendPositionResult[];
  summary: DividendBasketSummary;
  projection: ProjectionPoint[];
};

export const projectionYearOptions = [1, 3, 5, 10, 15, 20, 25, 30] as const;

export function getPayoutsPerYear(frequency: DividendPayoutFrequency) {
  const payouts: Record<DividendPayoutFrequency, number> = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    annually: 1
  };
  return payouts[frequency];
}

export function normalizeDividendSymbol(value: string) {
  const trimmed = value.trim();
  if (/^[a-z0-9.-]{1,10}$/i.test(trimmed) && !trimmed.includes(" ")) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function calculateDividendPosition(input: DividendPositionInput): DividendPositionResult {
  const symbol = normalizeDividendSymbol(input.symbol);
  const buyPrice = finiteNumber(input.buyPrice);
  const quantity = finiteNumber(input.quantity);
  const dividendYieldPercent = finiteNumber(input.dividendYieldPercent);
  const payoutsPerYear = getPayoutsPerYear(input.payoutFrequency);
  const projectionYears = Math.max(1, Math.round(finiteNumber(input.projectionYears)));

  const startingValue = buyPrice * quantity;
  const annualDividendPerShare = buyPrice * (dividendYieldPercent / 100);
  const dividendPerSharePerPeriod = annualDividendPerShare / payoutsPerYear;
  const totalDividendPerPeriod = dividendPerSharePerPeriod * quantity;
  const annualDividendIncome = annualDividendPerShare * quantity;
  const monthlyEquivalentIncome = annualDividendIncome / 12;

  let currentShares = quantity;
  let cumulativeDividends = 0;
  const projection: DividendProjectionYear[] = [];

  for (let year = 1; year <= projectionYears; year += 1) {
    const startingShares = currentShares;
    let annualDividendsEarned = 0;

    for (let period = 0; period < payoutsPerYear; period += 1) {
      const dividendCash = currentShares * dividendPerSharePerPeriod;
      annualDividendsEarned += dividendCash;
      cumulativeDividends += dividendCash;

      if (input.reinvestDividends && buyPrice > 0) {
        currentShares += dividendCash / buyPrice;
      }
    }

    projection.push({
      year,
      startingShares,
      endingShares: currentShares,
      annualDividendsEarned,
      cumulativeDividends,
      portfolioValue: currentShares * buyPrice,
      annualDividendIncome: currentShares * annualDividendPerShare,
      sharesAdded: currentShares - quantity
    });
  }

  const lastProjection = projection[projection.length - 1];

  return {
    id: input.id,
    symbol,
    buyPrice,
    quantity,
    dividendYieldPercent,
    payoutFrequency: input.payoutFrequency,
    startingValue,
    annualDividendPerShare,
    dividendPerSharePerPeriod,
    totalDividendPerPeriod,
    annualDividendIncome,
    monthlyEquivalentIncome,
    projectedShares: lastProjection?.endingShares ?? quantity,
    projectedValue: lastProjection?.portfolioValue ?? startingValue,
    projectedAnnualDividendIncome: lastProjection?.annualDividendIncome ?? annualDividendIncome,
    cumulativeDividends: lastProjection?.cumulativeDividends ?? 0,
    sharesAdded: (lastProjection?.endingShares ?? quantity) - quantity,
    projection
  };
}

export function calculateDividendBasket(inputs: DividendPositionInput[]): DividendBasketResult {
  const positions = inputs.map(calculateDividendPosition);
  const maxProjectionYears = Math.max(1, ...positions.map((position) => position.projection.length));

  const summary = positions.reduce<DividendBasketSummary>(
    (totals, position) => ({
      startingPortfolioValue: totals.startingPortfolioValue + position.startingValue,
      currentAnnualDividendIncome: totals.currentAnnualDividendIncome + position.annualDividendIncome,
      currentMonthlyEquivalentIncome: totals.currentMonthlyEquivalentIncome + position.monthlyEquivalentIncome,
      currentPeriodicPayout: totals.currentPeriodicPayout + position.totalDividendPerPeriod,
      projectedPortfolioValue: totals.projectedPortfolioValue + position.projectedValue,
      projectedAnnualDividendIncome: totals.projectedAnnualDividendIncome + position.projectedAnnualDividendIncome,
      cumulativeDividends: totals.cumulativeDividends + position.cumulativeDividends,
      totalGrowthFromReinvestment: totals.totalGrowthFromReinvestment + (position.projectedValue - position.startingValue),
      totalSharesAdded: totals.totalSharesAdded + position.sharesAdded
    }),
    {
      startingPortfolioValue: 0,
      currentAnnualDividendIncome: 0,
      currentMonthlyEquivalentIncome: 0,
      currentPeriodicPayout: 0,
      projectedPortfolioValue: 0,
      projectedAnnualDividendIncome: 0,
      cumulativeDividends: 0,
      totalGrowthFromReinvestment: 0,
      totalSharesAdded: 0
    }
  );

  const projection = Array.from({ length: maxProjectionYears }, (_, index) => {
    const year = index + 1;
    return positions.reduce<ProjectionPoint>(
      (totals, position) => {
        const point = position.projection[Math.min(index, position.projection.length - 1)];
        return {
          year,
          portfolioValue: totals.portfolioValue + (point?.portfolioValue ?? position.startingValue),
          cumulativeDividends: totals.cumulativeDividends + (point?.cumulativeDividends ?? 0),
          annualDividendIncome: totals.annualDividendIncome + (point?.annualDividendIncome ?? position.annualDividendIncome),
          sharesOwned: totals.sharesOwned + (point?.endingShares ?? position.quantity)
        };
      },
      { year, portfolioValue: 0, cumulativeDividends: 0, annualDividendIncome: 0, sharesOwned: 0 }
    );
  });

  return { positions, summary, projection };
}
