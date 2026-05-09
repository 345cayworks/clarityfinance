import { describe, expect, it } from "vitest";
import {
  calculateDividendBasket,
  calculateDividendPosition,
  calculateWeightedBasketYield,
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
});
