import { describe, expect, it } from "vitest";
import { calculateRetirementIncomeDuration } from "@/lib/calculations/finance";

describe("retirement income duration", () => {
  it("calculates simple duration with no growth and no inflation", () => {
    const result = calculateRetirementIncomeDuration({
      startingBalance: 120000,
      monthlyWithdrawal: 1000,
      inflationRatePercent: 0,
      annualGrowthRatePercent: 0
    });

    expect(result.totalMonths).toBe(120);
    expect(result.years).toBe(10);
    expect(result.months).toBe(0);
  });

  it("inflation reduces duration", () => {
    const flat = calculateRetirementIncomeDuration({
      startingBalance: 120000,
      monthlyWithdrawal: 1000,
      inflationRatePercent: 0,
      annualGrowthRatePercent: 0
    });
    const inflated = calculateRetirementIncomeDuration({
      startingBalance: 120000,
      monthlyWithdrawal: 1000,
      inflationRatePercent: 5,
      annualGrowthRatePercent: 0
    });

    expect(inflated.totalMonths).toBeLessThan(flat.totalMonths);
  });

  it("growth increases duration", () => {
    const flat = calculateRetirementIncomeDuration({
      startingBalance: 120000,
      monthlyWithdrawal: 1000,
      inflationRatePercent: 0,
      annualGrowthRatePercent: 0
    });
    const growing = calculateRetirementIncomeDuration({
      startingBalance: 120000,
      monthlyWithdrawal: 1000,
      inflationRatePercent: 0,
      annualGrowthRatePercent: 5,
      maxProjectionYears: 60
    });

    expect(growing.totalMonths).toBeGreaterThan(flat.totalMonths);
  });

  it("returns partial final year months correctly", () => {
    const result = calculateRetirementIncomeDuration({
      startingBalance: 15000,
      monthlyWithdrawal: 1000,
      inflationRatePercent: 0,
      annualGrowthRatePercent: 0
    });

    expect(result.totalMonths).toBe(15);
    expect(result.years).toBe(1);
    expect(result.months).toBe(3);
  });
});
