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
  it("includes base setup plus contingency in total setup cost", () => {
    const result = calculateRentRoomProfitability(baseInput());

    expect(result.baseSetupCost).toBe(5650);
    expect(result.contingencyAmount).toBe(565);
    expect(result.totalSetupCost).toBe(6215);
  });

  it("uses occupancy and additional vacancy buffer for effective monthly rent", () => {
    const result = calculateRentRoomProfitability({
      ...baseInput(),
      income: {
        ...baseInput().income,
        expectedMonthlyRent: 1000,
        occupancyPercent: 80,
        vacancyAllowancePercent: 10
      }
    });

    expect(result.effectiveMonthlyRentOnceOccupied).toBe(720);
    expect(result.effectiveMonthlyRent).toBe(result.effectiveMonthlyRentOnceOccupied);
  });

  it("calculates net monthly profit as effective rent plus other income minus added costs", () => {
    const result = calculateRentRoomProfitability({
      ...baseInput(),
      income: {
        ...baseInput().income,
        otherMonthlyIncome: 50
      }
    });

    expect(result.effectiveMonthlyRent).toBe(900);
    expect(result.monthlyAddedCosts).toBe(295);
    expect(result.netMonthlyProfitOnceOccupied).toBe(655);
    expect(result.netMonthlyProfit).toBe(result.netMonthlyProfitOnceOccupied);
  });

  it("calculates operating break-even from setup cost and net monthly profit", () => {
    const result = calculateRentRoomProfitability(baseInput());

    expect(result.operatingBreakEvenMonths).toBeCloseTo(6215 / 605);
    expect(result.breakEvenMonths).toBe(result.operatingBreakEvenMonths);
  });

  it("calculates calendar break-even by adding tenant search months", () => {
    const result = calculateRentRoomProfitability(baseInput());

    expect(result.calendarBreakEvenMonths).toBeCloseTo(1 + 6215 / 605);
  });

  it("uses only active rental months and subtracts setup cost for first-year net", () => {
    const result = calculateRentRoomProfitability(baseInput());

    expect(result.activeRentalMonthsFirstYear).toBe(11);
    expect(result.firstYearGrossIncome).toBe(900 * 11);
    expect(result.firstYearAddedCosts).toBe(295 * 11);
    expect(result.firstYearOperatingProfit).toBe(605 * 11);
    expect(result.firstYearNetAfterSetup).toBeCloseTo(605 * 11 - 6215);
    expect(result.firstYearNet).toBe(result.firstYearNetAfterSetup);
  });

  it("calculates recurring annual profit after break-even", () => {
    const result = calculateRentRoomProfitability(baseInput());

    expect(result.annualRecurringProfitAfterBreakEven).toBe(605 * 12);
    expect(result.annualProfitAfterBreakEven).toBe(result.annualRecurringProfitAfterBreakEven);
  });

  it("does not count security deposit as profit", () => {
    const withoutDeposit = calculateRentRoomProfitability(baseInput());
    const withDeposit = calculateRentRoomProfitability({
      ...baseInput(),
      income: {
        ...baseInput().income,
        securityDepositCollected: 5000
      } as RentRoomInput["income"] & { securityDepositCollected: number }
    });

    expect(withDeposit.netMonthlyProfitOnceOccupied).toBe(withoutDeposit.netMonthlyProfitOnceOccupied);
    expect(withDeposit.firstYearNetAfterSetup).toBe(withoutDeposit.firstYearNetAfterSetup);
  });

  it("clamps negative or out-of-range percentages safely", () => {
    const result = calculateRentRoomProfitability({
      ...baseInput(),
      setup: {
        ...baseInput().setup,
        oneTimeContingencyPercent: -20
      },
      income: {
        ...baseInput().income,
        expectedMonthlyRent: 1000,
        occupancyPercent: 150,
        vacancyAllowancePercent: -30,
        monthsToFindTenant: 25
      }
    });

    expect(result.contingencyAmount).toBe(0);
    expect(result.effectiveMonthlyRentOnceOccupied).toBe(1000);
    expect(result.activeRentalMonthsFirstYear).toBe(0);
    expect(result.firstYearGrossIncome).toBe(0);
  });

  it("returns null break-even for zero or negative monthly profit", () => {
    const result = calculateRentRoomProfitability({
      ...baseInput(),
      income: {
        ...baseInput().income,
        expectedMonthlyRent: 100
      }
    });

    expect(result.netMonthlyProfitOnceOccupied).toBeLessThanOrEqual(0);
    expect(result.operatingBreakEvenMonths).toBeNull();
    expect(result.calendarBreakEvenMonths).toBeNull();
    expect(result.breakEvenMonths).toBeNull();
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

  it("does not return NaN or Infinity for any numeric result values", () => {
    const result = calculateRentRoomProfitability({
      setup: { oneTimeContingencyPercent: Number.POSITIVE_INFINITY },
      income: {
        expectedMonthlyRent: Number.NaN,
        occupancyPercent: Number.POSITIVE_INFINITY,
        vacancyAllowancePercent: Number.NEGATIVE_INFINITY,
        monthsToFindTenant: Number.POSITIVE_INFINITY
      },
      costs: { utilitiesIncrease: Number.NaN }
    });

    expect(Object.values(result).every((value) => typeof value !== "number" || Number.isFinite(value))).toBe(true);
  });
});
