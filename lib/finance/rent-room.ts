import { toNumber } from "@/lib/finance/calculations";

export type RentRoomInput = {
  setup: {
    basicRepairs?: unknown;
    painting?: unknown;
    electricalPlumbing?: unknown;
    airConditioningFan?: unknown;
    bathroomPrep?: unknown;
    doorLockSecurity?: unknown;
    wifiUpgrade?: unknown;
    cleaningDeepClean?: unknown;
    beddingFurniture?: unknown;
    deskChairStorage?: unknown;
    miniFridgeMicrowave?: unknown;
    decorStaging?: unknown;
    permitsLegalAdmin?: unknown;
    otherSetupCost?: unknown;
    oneTimeContingencyPercent?: unknown;
  };
  income: {
    expectedMonthlyRent?: unknown;
    occupancyPercent?: unknown;
    monthsToFindTenant?: unknown;
    vacancyAllowancePercent?: unknown;
    otherMonthlyIncome?: unknown;
  };
  costs: {
    utilitiesIncrease?: unknown;
    internetIncrease?: unknown;
    cleaningMonthly?: unknown;
    maintenanceReserve?: unknown;
    insuranceIncrease?: unknown;
    managementHelp?: unknown;
    supplies?: unknown;
    otherMonthlyCost?: unknown;
  };
};

export type RentRoomResult = {
  totalSetupCost: number;
  effectiveMonthlyRent: number;
  monthlyAddedCosts: number;
  netMonthlyProfit: number;
  breakEvenMonths: number | null;
  firstYearNet: number;
  annualProfitAfterBreakEven: number;
  statusLabel: string;
};

export function calculateRentRoomProfitability(input: RentRoomInput): RentRoomResult {
  const setup = input.setup ?? {};
  const income = input.income ?? {};
  const costs = input.costs ?? {};

  const baseSetupCost =
    toNumber(setup.basicRepairs) +
    toNumber(setup.painting) +
    toNumber(setup.electricalPlumbing) +
    toNumber(setup.airConditioningFan) +
    toNumber(setup.bathroomPrep) +
    toNumber(setup.doorLockSecurity) +
    toNumber(setup.wifiUpgrade) +
    toNumber(setup.cleaningDeepClean) +
    toNumber(setup.beddingFurniture) +
    toNumber(setup.deskChairStorage) +
    toNumber(setup.miniFridgeMicrowave) +
    toNumber(setup.decorStaging) +
    toNumber(setup.permitsLegalAdmin) +
    toNumber(setup.otherSetupCost);

  const contingencyAmount = baseSetupCost * (toNumber(setup.oneTimeContingencyPercent) / 100);
  const totalSetupCost = baseSetupCost + contingencyAmount;

  const occupancyFactor = toNumber(income.occupancyPercent) / 100;
  const vacancyFactor = Math.max(0, 1 - toNumber(income.vacancyAllowancePercent) / 100);
  const tenantSearchFactor = Math.max(0, (12 - toNumber(income.monthsToFindTenant)) / 12);

  const effectiveMonthlyRent = toNumber(income.expectedMonthlyRent) * occupancyFactor * vacancyFactor;

  const monthlyAddedCosts =
    toNumber(costs.utilitiesIncrease) +
    toNumber(costs.internetIncrease) +
    toNumber(costs.cleaningMonthly) +
    toNumber(costs.maintenanceReserve) +
    toNumber(costs.insuranceIncrease) +
    toNumber(costs.managementHelp) +
    toNumber(costs.supplies) +
    toNumber(costs.otherMonthlyCost);

  const netMonthlyProfit = effectiveMonthlyRent + toNumber(income.otherMonthlyIncome) - monthlyAddedCosts;
  const breakEvenMonths = netMonthlyProfit > 0 ? totalSetupCost / netMonthlyProfit : null;
  const firstYearNet = netMonthlyProfit * 12 * tenantSearchFactor - totalSetupCost;
  const annualProfitAfterBreakEven = netMonthlyProfit * 12;

  const statusLabel =
    netMonthlyProfit <= 0 || breakEvenMonths === null
      ? "Not recommended as structured"
      : breakEvenMonths < 6
        ? "Strong opportunity"
        : breakEvenMonths <= 12
          ? "Reasonable opportunity"
          : breakEvenMonths <= 24
            ? "Longer payback"
            : "Review carefully";

  return {
    totalSetupCost,
    effectiveMonthlyRent,
    monthlyAddedCosts,
    netMonthlyProfit,
    breakEvenMonths,
    firstYearNet,
    annualProfitAfterBreakEven,
    statusLabel
  };
}
