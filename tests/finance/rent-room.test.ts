import { describe, expect, it } from "vitest";
import { calculateRentRoomProfitability, type RentRoomInput } from "@/lib/finance/rent-room";

const baseInput = (): RentRoomInput => ({
  setup: {
    basicRepairs: 1200,
    painting: 600,
    electricalPlumbing: 500,
    airConditioningFan: 450,
    bathroomPrep: 500,
    doorLockSecurity: 300,
    wifiUpgrade: 120,
    cleaningDeepClean: 150,
    beddingFurniture: 900,
    deskChairStorage: 300,
    miniFridgeMicrowave: 250,
    decorStaging: 180,
    permitsLegalAdmin: 200,
    otherSetupCost: 0,
    oneTimeContingencyPercent: 10
  },
  income: {
    expectedMonthlyRent: 1000,
    occupancyPercent: 90,
    monthsToFindTenant: 1,
    vacancyAllowancePercent: 0,
    otherMonthlyIncome: 0
  },
  costs: {
    utilitiesIncrease: 120,
    internetIncrease: 30,
    cleaningMonthly: 40,
    maintenanceReserve: 50,
    insuranceIncrease: 30,
    managementHelp: 0,
    supplies: 25,
    otherMonthlyCost: 0
  }
});

describe("rent-a-room calculations", () => {
  it("returns finite key scenario values", () => {
    const result = calculateRentRoomProfitability(baseInput());

    expect(result.totalSetupCost).toBe(6215);
    expect(result.effectiveMonthlyRent).toBe(900);
    expect(result.monthlyAddedCosts).toBe(295);
    expect(result.netMonthlyProfit).toBe(605);
    expect(result.firstYearNet).toBeCloseTo(605 * 11 - 6215);
    expect(Object.values(result).every((value) => typeof value !== "number" || Number.isFinite(value))).toBe(true);
  });

  it("restores the same results after a saved input is loaded", () => {
    const original = baseInput();
    const loaded = JSON.parse(JSON.stringify(original)) as RentRoomInput;

    expect(calculateRentRoomProfitability(loaded)).toEqual(calculateRentRoomProfitability(original));
  });

  it("editing loaded inputs recalculates scenario results", () => {
    const loaded = baseInput();
    const original = calculateRentRoomProfitability(loaded);
    const edited = calculateRentRoomProfitability({
      ...loaded,
      income: {
        ...loaded.income,
        expectedMonthlyRent: 1200
      }
    });

    expect(edited.effectiveMonthlyRent).toBeGreaterThan(original.effectiveMonthlyRent);
    expect(edited.netMonthlyProfit).toBeGreaterThan(original.netMonthlyProfit);
    expect(edited.breakEvenMonths).not.toBe(original.breakEvenMonths);
  });

  it("handles missing values safely without NaN or Infinity", () => {
    const result = calculateRentRoomProfitability({ setup: {}, income: {}, costs: {} });

    expect(result.totalSetupCost).toBe(0);
    expect(result.effectiveMonthlyRent).toBe(0);
    expect(result.monthlyAddedCosts).toBe(0);
    expect(result.netMonthlyProfit).toBe(0);
    expect(result.breakEvenMonths).toBeNull();
    expect(Object.values(result).every((value) => typeof value !== "number" || Number.isFinite(value))).toBe(true);
  });
});
