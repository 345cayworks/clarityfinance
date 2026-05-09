import { describe, expect, it } from "vitest";
import {
  buildBasketProjection,
  calculateDividendBasket,
  calculateDividendPosition,
  calculateWeightedBasketYield,
  createEmptyDividendPosition,
  type DividendPositionInput
} from "@/lib/finance/dividend-reinvestment-calculator";

const basePosition = (overrides: Partial<DividendPositionInput> = {}): DividendPositionInput => ({
  id: "pos_1",
  symbol: "ABC",
  buyPrice: 100,
  quantity: 10,
  dividendYieldPercent: 12,
  payoutFrequency: "monthly",
  reinvestDividends: true,
  ...overrides
});

describe("dividend reinvestment calculator", () => {
  it("defaults new empty dividend positions to weekly payouts", () => {
    expect(createEmptyDividendPosition("new_position").payoutFrequency).toBe("weekly");
  });

  it("preserves an existing quarterly payout frequency when recalculated", () => {
    const result = calculateDividendPosition(basePosition({ payoutFrequency: "quarterly" }), 12);

    expect(result.payoutFrequency).toBe("quarterly");
  });

  it("calculates monthly payout amounts", () => {
    const result = calculateDividendPosition(basePosition(), 12);

    expect(result.annualDividendPerShare).toBeCloseTo(12);
    expect(result.dividendPerSharePerPeriod).toBeCloseTo(1);
    expect(result.totalDividendPerPeriod).toBeCloseTo(10);
    expect(result.monthlyEquivalentIncome).toBeCloseTo(10);
  });

  it("calculates quarterly payout amounts", () => {
    const result = calculateDividendPosition(basePosition({ payoutFrequency: "quarterly" }), 12);

    expect(result.dividendPerSharePerPeriod).toBeCloseTo(3);
    expect(result.totalDividendPerPeriod).toBeCloseTo(30);
  });

  it("calculates weekly payout amounts", () => {
    const result = calculateDividendPosition(basePosition({ payoutFrequency: "weekly" }), 12);

    expect(result.dividendPerSharePerPeriod).toBeCloseTo(12 / 52);
    expect(result.totalDividendPerPeriod).toBeCloseTo(120 / 52);
    expect(result.weeklyEquivalentIncome).toBeCloseTo(120 / 52);
  });

  it("increases shares when dividends are reinvested", () => {
    const result = calculateDividendPosition(basePosition({ reinvestDividends: true }), 12);

    expect(result.projectedShares).toBeGreaterThan(10);
    expect(result.sharesAdded).toBeGreaterThan(0);
  });

  it("does not increase shares when dividends are not reinvested", () => {
    const result = calculateDividendPosition(basePosition({ reinvestDividends: false }), 12);

    expect(result.projectedShares).toBe(10);
    expect(result.sharesAdded).toBe(0);
  });

  it("creates no cash dividends received for reinvested dividends", () => {
    const result = calculateDividendPosition(basePosition({ reinvestDividends: true }), 12);

    expect(result.projectedShareValue).toBeGreaterThan(result.startingValue);
    expect(result.dividendsReinvested).toBeGreaterThan(0);
    expect(result.cashDividendsReceived).toBe(0);
  });

  it("creates cash dividends received for non-reinvested dividends", () => {
    const result = calculateDividendPosition(basePosition({ reinvestDividends: false }), 12);

    expect(result.dividendsReinvested).toBe(0);
    expect(result.cashDividendsReceived).toBeCloseTo(120);
  });

  it("does not double-count cash dividends in total value", () => {
    const result = calculateDividendPosition(basePosition({ reinvestDividends: false }), 12);

    expect(result.projectedShareValue).toBeCloseTo(1000);
    expect(result.totalValueWithCashDividends).toBeCloseTo(1120);
  });

  it("returns one monthly chart point per projection month", () => {
    const projection = buildBasketProjection([basePosition({ payoutFrequency: "weekly" })], 6, "monthly");

    expect(projection).toHaveLength(6);
    expect(projection.map((point) => point.label)).toEqual(["M1", "M2", "M3", "M4", "M5", "M6"]);
  });

  it("returns one yearly chart point per projection year", () => {
    const projection = buildBasketProjection([basePosition({ payoutFrequency: "monthly" })], 36, "yearly");

    expect(projection).toHaveLength(3);
    expect(projection.map((point) => point.label)).toEqual(["Y1", "Y2", "Y3"]);
  });

  it("uses unique payout labels for weekly chart events", () => {
    const projection = buildBasketProjection([basePosition({ payoutFrequency: "weekly" })], 1, "payout");
    const labels = projection.map((point) => point.label);

    expect(labels).toEqual(["P1", "P2", "P3", "P4"]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps chart total value equal to share value plus cash dividends", () => {
    const projection = buildBasketProjection([
      basePosition({ id: "cash", reinvestDividends: false }),
      basePosition({ id: "reinvest", reinvestDividends: true })
    ], 12, "monthly");

    projection.forEach((point) => {
      expect(point.totalValueWithCashDividends).toBeCloseTo(point.projectedShareValue + point.cashDividendsReceived);
    });
  });

  it("calculates basket weighted dividend yield", () => {
    const lowYield = calculateDividendPosition(basePosition({ id: "low", buyPrice: 100, quantity: 10, dividendYieldPercent: 5 }), 12);
    const highYield = calculateDividendPosition(basePosition({ id: "high", buyPrice: 200, quantity: 5, dividendYieldPercent: 10 }), 12);

    expect(calculateWeightedBasketYield([lowYield, highYield])).toBeCloseTo(7.5);
  });

  it("keeps high-yield projections finite", () => {
    const basket = calculateDividendBasket([
      basePosition({ dividendYieldPercent: 250, payoutFrequency: "weekly", reinvestDividends: true })
    ], 12);

    const values = [
      basket.summary.projectedShareValue,
      basket.summary.totalValueWithCashDividends,
      basket.summary.projectedAnnualDividendIncome,
      basket.summary.basketDividendYield
    ];

    expect(values.every(Number.isFinite)).toBe(true);
  });

  it("keeps basket comparison values internally consistent", () => {
    const basket = calculateDividendBasket([
      basePosition({ id: "cash", reinvestDividends: false }),
      basePosition({ id: "reinvest", reinvestDividends: true })
    ], 12, "monthly");

    expect(basket.summary.reinvestmentValue).toBeCloseTo(basket.summary.totalValueWithCashDividends);
    expect(basket.summary.reinvestmentDifference).toBeCloseTo(
      basket.summary.reinvestmentValue - basket.summary.noReinvestmentValue
    );
    expect(basket.summary.noReinvestmentValue).toBeGreaterThan(0);
  });
});
