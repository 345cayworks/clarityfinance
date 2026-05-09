export type DividendPayoutFrequency = "weekly" | "monthly" | "quarterly" | "annually";
export type ProjectionInterval = "payout" | "monthly" | "yearly";

export type ProjectionPeriodOption = {
  label: string;
  months: number;
};

export type DividendPositionInput = {
  id: string;
  symbol: string;
  buyPrice: number;
  quantity: number;
  dividendYieldPercent: number;
  payoutFrequency: DividendPayoutFrequency;
  reinvestDividends: boolean;
};

export type DividendProjectionPoint = {
  periodIndex: number;
  month: number;
  label: string;
  startingShares: number;
  endingShares: number;
  dividendsGenerated: number;
  dividendsReinvested: number;
  cashDividendsReceived: number;
  projectedShareValue: number;
  projectedPortfolioValue: number;
  totalValueWithCashDividends: number;
  dividendsEarned: number;
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
  reinvestDividends: boolean;
  startingValue: number;
  annualDividendPerShare: number;
  dividendPerSharePerPeriod: number;
  totalDividendPerPeriod: number;
  annualDividendIncome: number;
  monthlyEquivalentIncome: number;
  weeklyEquivalentIncome: number;
  projectedShares: number;
  projectedShareValue: number;
  projectedPortfolioValue: number;
  totalValueWithCashDividends: number;
  projectedValue: number;
  projectedAnnualDividendIncome: number;
  dividendsGenerated: number;
  dividendsReinvested: number;
  cashDividendsReceived: number;
  cumulativeDividends: number;
  sharesAdded: number;
  projection: DividendProjectionPoint[];
};

export type ProjectionPoint = {
  periodIndex: number;
  month: number;
  label: string;
  projectedShareValue: number;
  totalValueWithCashDividends: number;
  dividendsGenerated: number;
  dividendsReinvested: number;
  cashDividendsReceived: number;
  portfolioValue: number;
  cumulativeDividends: number;
  annualDividendIncome: number;
  sharesOwned: number;
};

export type DividendBasketSummary = {
  startingPortfolioValue: number;
  currentAnnualDividendIncome: number;
  currentMonthlyEquivalentIncome: number;
  currentWeeklyEquivalentIncome: number;
  currentPeriodicPayout: number;
  weeklyPayoutTotal: number;
  monthlyPayoutTotal: number;
  quarterlyPayoutTotal: number;
  annualPayoutTotal: number;
  basketDividendYield: number;
  averageYieldAcrossHoldings: number;
  highestYieldPosition: { symbol: string; yieldPercent: number } | null;
  lowestYieldPosition: { symbol: string; yieldPercent: number } | null;
  projectedShareValue: number;
  projectedPortfolioValue: number;
  totalValueWithCashDividends: number;
  projectedAnnualDividendIncome: number;
  dividendsGenerated: number;
  dividendsReinvested: number;
  cashDividendsReceived: number;
  cumulativeDividends: number;
  totalGrowthFromReinvestment: number;
  totalSharesAdded: number;
  noReinvestmentValue: number;
  reinvestmentValue: number;
  reinvestmentDifference: number;
};

export type DividendBasketResult = {
  positions: DividendPositionResult[];
  summary: DividendBasketSummary;
  projection: ProjectionPoint[];
};

export type PositionCardSavePayload = {
  cardType: "dividend_position";
  input: DividendPositionInput;
  result: DividendPositionResult;
};

export type BasketSummarySavePayload = {
  cardType: "dividend_summary";
  inputs: DividendPositionInput[];
  result: DividendBasketSummary;
};

export type ProjectionSavePayload = {
  cardType: "dividend_projection";
  inputs: DividendPositionInput[];
  projectionPeriodMonths: number;
  result: ProjectionPoint[];
};

export const projectionPeriodOptions: ProjectionPeriodOption[] = [
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
  { label: "3 years", months: 36 },
  { label: "5 years", months: 60 },
  { label: "10 years", months: 120 },
  { label: "20 years", months: 240 },
  { label: "30 years", months: 360 }
];

export function normalizeProjectionPeriodToMonths(value: number | ProjectionPeriodOption) {
  const months = typeof value === "number" ? value : value.months;
  return Number.isFinite(months) && months > 0 ? Math.round(months) : 12;
}

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

export function validateDividendPosition(input: DividendPositionInput, existingInputs: DividendPositionInput[] = []) {
  const errors: string[] = [];
  const symbol = normalizeDividendSymbol(input.symbol);

  if (!symbol) errors.push("Ticker/name is required.");
  if (!Number.isFinite(input.buyPrice) || input.buyPrice <= 0) errors.push("Buy price must be greater than 0.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) errors.push("Quantity must be greater than 0.");
  if (!Number.isFinite(input.dividendYieldPercent) || input.dividendYieldPercent < 0) errors.push("Dividend yield must be 0 or greater.");
  if (!input.payoutFrequency) errors.push("Payout frequency is required.");
  if (existingInputs.some((position) => normalizeDividendSymbol(position.symbol) === symbol)) {
    errors.push("This holding is already in your basket. Edit the existing holding or use a different name.");
  }

  return errors;
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function getPayoutMonths(frequency: DividendPayoutFrequency, projectionMonths: number) {
  const months: number[] = [];
  const payoutsPerYear = getPayoutsPerYear(frequency);
  const intervalMonths = 12 / payoutsPerYear;
  const totalPeriods = Math.floor((projectionMonths / 12) * payoutsPerYear);

  for (let index = 1; index <= totalPeriods; index += 1) {
    months.push(index * intervalMonths);
  }

  return months;
}

export function buildPositionProjection(input: DividendPositionInput, projectionMonths: number): DividendProjectionPoint[] {
  const buyPrice = finiteNumber(input.buyPrice);
  const quantity = finiteNumber(input.quantity);
  const annualDividendPerShare = buyPrice * (finiteNumber(input.dividendYieldPercent) / 100);
  const payoutsPerYear = getPayoutsPerYear(input.payoutFrequency);
  const dividendPerSharePerPeriod = annualDividendPerShare / payoutsPerYear;

  let currentShares = quantity;
  let dividendsGenerated = 0;
  let dividendsReinvested = 0;
  let cashDividendsReceived = 0;
  const projection: DividendProjectionPoint[] = [];

  getPayoutMonths(input.payoutFrequency, projectionMonths).forEach((month, index) => {
    const startingShares = currentShares;
    const dividendsEarned = currentShares * dividendPerSharePerPeriod;
    dividendsGenerated += dividendsEarned;

    if (input.reinvestDividends && buyPrice > 0) {
      dividendsReinvested += dividendsEarned;
      currentShares += dividendsEarned / buyPrice;
    } else {
      cashDividendsReceived += dividendsEarned;
    }

    const projectedShareValue = currentShares * buyPrice;
    const totalValueWithCashDividends = projectedShareValue + cashDividendsReceived;

    projection.push({
      periodIndex: index + 1,
      month,
      label: formatProjectionLabel(month, index + 1),
      startingShares,
      endingShares: currentShares,
      dividendsGenerated,
      dividendsReinvested,
      cashDividendsReceived,
      projectedShareValue,
      projectedPortfolioValue: projectedShareValue,
      totalValueWithCashDividends,
      dividendsEarned,
      cumulativeDividends: dividendsGenerated,
      portfolioValue: projectedShareValue,
      annualDividendIncome: currentShares * annualDividendPerShare,
      sharesAdded: currentShares - quantity
    });
  });

  return projection;
}

export function calculateDividendPosition(input: DividendPositionInput, projectionMonths = 120): DividendPositionResult {
  const symbol = normalizeDividendSymbol(input.symbol);
  const buyPrice = finiteNumber(input.buyPrice);
  const quantity = finiteNumber(input.quantity);
  const dividendYieldPercent = finiteNumber(input.dividendYieldPercent);
  const payoutsPerYear = getPayoutsPerYear(input.payoutFrequency);
  const startingValue = buyPrice * quantity;
  const annualDividendPerShare = buyPrice * (dividendYieldPercent / 100);
  const dividendPerSharePerPeriod = annualDividendPerShare / payoutsPerYear;
  const totalDividendPerPeriod = dividendPerSharePerPeriod * quantity;
  const annualDividendIncome = annualDividendPerShare * quantity;
  const projection = buildPositionProjection({ ...input, symbol }, normalizeProjectionPeriodToMonths(projectionMonths));
  const lastProjection = projection[projection.length - 1];
  const projectedShares = lastProjection?.endingShares ?? quantity;
  const projectedShareValue = lastProjection?.projectedShareValue ?? startingValue;
  const dividendsGenerated = lastProjection?.dividendsGenerated ?? 0;
  const dividendsReinvested = lastProjection?.dividendsReinvested ?? 0;
  const cashDividendsReceived = lastProjection?.cashDividendsReceived ?? 0;
  const totalValueWithCashDividends = lastProjection?.totalValueWithCashDividends ?? startingValue;

  return {
    id: input.id,
    symbol,
    buyPrice,
    quantity,
    dividendYieldPercent,
    payoutFrequency: input.payoutFrequency,
    reinvestDividends: input.reinvestDividends,
    startingValue,
    annualDividendPerShare,
    dividendPerSharePerPeriod,
    totalDividendPerPeriod,
    annualDividendIncome,
    monthlyEquivalentIncome: annualDividendIncome / 12,
    weeklyEquivalentIncome: annualDividendIncome / 52,
    projectedShares,
    projectedShareValue,
    projectedPortfolioValue: projectedShareValue,
    totalValueWithCashDividends,
    projectedValue: projectedShareValue,
    projectedAnnualDividendIncome: lastProjection?.annualDividendIncome ?? annualDividendIncome,
    dividendsGenerated,
    dividendsReinvested,
    cashDividendsReceived,
    cumulativeDividends: dividendsGenerated,
    sharesAdded: projectedShares - quantity,
    projection
  };
}

export function calculateWeightedBasketYield(positions: DividendPositionResult[]) {
  const startingValue = positions.reduce((sum, position) => sum + position.startingValue, 0);
  const annualIncome = positions.reduce((sum, position) => sum + position.annualDividendIncome, 0);
  return startingValue > 0 ? (annualIncome / startingValue) * 100 : 0;
}

export function calculateSimpleAverageYield(positions: DividendPositionResult[]) {
  if (positions.length === 0) return 0;
  return positions.reduce((sum, position) => sum + position.dividendYieldPercent, 0) / positions.length;
}

export function calculateBasketDividendSummary(positions: DividendPositionResult[]): DividendBasketSummary {
  const highestYieldPosition = positions.reduce<DividendPositionResult | null>((highest, position) => {
    if (!highest || position.dividendYieldPercent > highest.dividendYieldPercent) return position;
    return highest;
  }, null);
  const lowestYieldPosition = positions.reduce<DividendPositionResult | null>((lowest, position) => {
    if (!lowest || position.dividendYieldPercent < lowest.dividendYieldPercent) return position;
    return lowest;
  }, null);

  const totals = positions.reduce(
    (summary, position) => ({
      startingPortfolioValue: summary.startingPortfolioValue + position.startingValue,
      currentAnnualDividendIncome: summary.currentAnnualDividendIncome + position.annualDividendIncome,
      currentMonthlyEquivalentIncome: summary.currentMonthlyEquivalentIncome + position.monthlyEquivalentIncome,
      currentWeeklyEquivalentIncome: summary.currentWeeklyEquivalentIncome + position.weeklyEquivalentIncome,
      currentPeriodicPayout: summary.currentPeriodicPayout + position.totalDividendPerPeriod,
      weeklyPayoutTotal: summary.weeklyPayoutTotal + (position.payoutFrequency === "weekly" ? position.totalDividendPerPeriod : 0),
      monthlyPayoutTotal: summary.monthlyPayoutTotal + (position.payoutFrequency === "monthly" ? position.totalDividendPerPeriod : 0),
      quarterlyPayoutTotal: summary.quarterlyPayoutTotal + (position.payoutFrequency === "quarterly" ? position.totalDividendPerPeriod : 0),
      annualPayoutTotal: summary.annualPayoutTotal + (position.payoutFrequency === "annually" ? position.totalDividendPerPeriod : 0),
      projectedShareValue: summary.projectedShareValue + position.projectedShareValue,
      projectedPortfolioValue: summary.projectedPortfolioValue + position.projectedPortfolioValue,
      totalValueWithCashDividends: summary.totalValueWithCashDividends + position.totalValueWithCashDividends,
      projectedAnnualDividendIncome: summary.projectedAnnualDividendIncome + position.projectedAnnualDividendIncome,
      dividendsGenerated: summary.dividendsGenerated + position.dividendsGenerated,
      dividendsReinvested: summary.dividendsReinvested + position.dividendsReinvested,
      cashDividendsReceived: summary.cashDividendsReceived + position.cashDividendsReceived,
      cumulativeDividends: summary.cumulativeDividends + position.dividendsGenerated,
      totalGrowthFromReinvestment: summary.totalGrowthFromReinvestment + (position.projectedShareValue - position.startingValue),
      totalSharesAdded: summary.totalSharesAdded + position.sharesAdded
    }),
    {
      startingPortfolioValue: 0,
      currentAnnualDividendIncome: 0,
      currentMonthlyEquivalentIncome: 0,
      currentWeeklyEquivalentIncome: 0,
      currentPeriodicPayout: 0,
      weeklyPayoutTotal: 0,
      monthlyPayoutTotal: 0,
      quarterlyPayoutTotal: 0,
      annualPayoutTotal: 0,
      projectedShareValue: 0,
      projectedPortfolioValue: 0,
      totalValueWithCashDividends: 0,
      projectedAnnualDividendIncome: 0,
      dividendsGenerated: 0,
      dividendsReinvested: 0,
      cashDividendsReceived: 0,
      cumulativeDividends: 0,
      totalGrowthFromReinvestment: 0,
      totalSharesAdded: 0
    }
  );

  return {
    ...totals,
    basketDividendYield: calculateWeightedBasketYield(positions),
    averageYieldAcrossHoldings: calculateSimpleAverageYield(positions),
    highestYieldPosition: highestYieldPosition ? { symbol: highestYieldPosition.symbol, yieldPercent: highestYieldPosition.dividendYieldPercent } : null,
    lowestYieldPosition: lowestYieldPosition ? { symbol: lowestYieldPosition.symbol, yieldPercent: lowestYieldPosition.dividendYieldPercent } : null,
    noReinvestmentValue: 0,
    reinvestmentValue: totals.totalValueWithCashDividends,
    reinvestmentDifference: 0
  };
}

export function calculateBasketComparison(inputs: DividendPositionInput[], projectionMonths: number) {
  const noReinvestmentInputs = inputs.map((input) => ({ ...input, reinvestDividends: false }));
  const selectedPositions = inputs.map((input) => calculateDividendPosition(input, projectionMonths));
  const noReinvestmentPositions = noReinvestmentInputs.map((input) => calculateDividendPosition(input, projectionMonths));
  const selectedValue = selectedPositions.reduce((sum, position) => sum + position.totalValueWithCashDividends, 0);
  const noReinvestmentValue = noReinvestmentPositions.reduce((sum, position) => sum + position.totalValueWithCashDividends, 0);
  return {
    noReinvestmentValue,
    reinvestmentValue: selectedValue,
    reinvestmentDifference: selectedValue - noReinvestmentValue
  };
}

function monthBucket(month: number, interval: ProjectionInterval) {
  if (interval === "yearly") return Math.max(12, Math.ceil(month / 12) * 12);
  if (interval === "monthly") return Math.max(1, Math.ceil(month));
  return month;
}

function formatProjectionLabel(month: number, periodIndex: number) {
  if (month < 1) return `P${periodIndex}`;
  if (month < 12) return `M${Math.ceil(month)}`;
  const year = Math.floor(month / 12);
  const remainingMonths = Math.round(month % 12);
  return remainingMonths === 0 ? `Y${year}` : `Y${year} M${remainingMonths}`;
}

function latestPositionPointAt(position: DividendPositionResult, month: number) {
  let latest: DividendProjectionPoint | null = null;
  for (const point of position.projection) {
    if (point.month <= month + 0.000001) latest = point;
    else break;
  }
  return latest;
}

export function aggregateProjectionForChart(
  positions: DividendPositionResult[],
  projectionMonths: number,
  interval: ProjectionInterval
): ProjectionPoint[] {
  if (positions.length === 0) return [];

  const monthSet = new Set<number>();
  if (interval === "payout") {
    positions.forEach((position) => position.projection.forEach((point) => monthSet.add(Number(point.month.toFixed(4)))));
  } else {
    const step = interval === "yearly" ? 12 : 1;
    for (let month = step; month <= projectionMonths; month += step) monthSet.add(month);
  }

  if (monthSet.size === 0) monthSet.add(projectionMonths);

  return [...monthSet]
    .sort((a, b) => a - b)
    .map((rawMonth, index) => {
      const month = monthBucket(rawMonth, interval);
      const totals = positions.reduce(
        (sum, position) => {
          const point = latestPositionPointAt(position, rawMonth);
          const shareValue = point?.projectedShareValue ?? position.startingValue;
          const totalValue = point?.totalValueWithCashDividends ?? position.startingValue;
          const dividendsGenerated = point?.dividendsGenerated ?? 0;
          return {
            projectedShareValue: sum.projectedShareValue + shareValue,
            totalValueWithCashDividends: sum.totalValueWithCashDividends + totalValue,
            dividendsGenerated: sum.dividendsGenerated + dividendsGenerated,
            dividendsReinvested: sum.dividendsReinvested + (point?.dividendsReinvested ?? 0),
            cashDividendsReceived: sum.cashDividendsReceived + (point?.cashDividendsReceived ?? 0),
            portfolioValue: sum.portfolioValue + shareValue,
            cumulativeDividends: sum.cumulativeDividends + dividendsGenerated,
            annualDividendIncome: sum.annualDividendIncome + (point?.annualDividendIncome ?? position.annualDividendIncome),
            sharesOwned: sum.sharesOwned + (point?.endingShares ?? position.quantity)
          };
        },
        {
          projectedShareValue: 0,
          totalValueWithCashDividends: 0,
          dividendsGenerated: 0,
          dividendsReinvested: 0,
          cashDividendsReceived: 0,
          portfolioValue: 0,
          cumulativeDividends: 0,
          annualDividendIncome: 0,
          sharesOwned: 0
        }
      );

      return {
        periodIndex: index + 1,
        month,
        label: formatProjectionLabel(month, index + 1),
        ...totals
      };
    });
}

export function buildBasketProjection(inputs: DividendPositionInput[], projectionMonths: number, interval: ProjectionInterval = "payout") {
  const positions = inputs.map((input) => calculateDividendPosition(input, projectionMonths));
  return aggregateProjectionForChart(positions, projectionMonths, interval);
}

export function calculateDividendBasket(
  inputs: DividendPositionInput[],
  projectionMonths = 120,
  interval: ProjectionInterval = "payout"
): DividendBasketResult {
  const normalizedMonths = normalizeProjectionPeriodToMonths(projectionMonths);
  const positions = inputs.map((input) => calculateDividendPosition(input, normalizedMonths));
  const comparison = calculateBasketComparison(inputs, normalizedMonths);
  const summary = { ...calculateBasketDividendSummary(positions), ...comparison };
  const projection = aggregateProjectionForChart(positions, normalizedMonths, interval);

  return { positions, summary, projection };
}
