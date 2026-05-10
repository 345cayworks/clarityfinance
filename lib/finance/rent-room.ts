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
  baseSetupCost: number;
  contingencyAmount: number;
  totalSetupCost: number;
  effectiveMonthlyRent: number;
  effectiveMonthlyRentOnceOccupied: number;
  monthlyAddedCosts: number;
  netMonthlyProfit: number;
  netMonthlyProfitOnceOccupied: number;
  operatingBreakEvenMonths: number | null;
  calendarBreakEvenMonths: number | null;
  breakEvenMonths: number | null;
  activeRentalMonthsFirstYear: number;
  firstYearGrossIncome: number;
  firstYearAddedCosts: number;
  firstYearOperatingProfit: number;
  firstYearNet: number;
  firstYearNetAfterSetup: number;
  annualProfitAfterBreakEven: number;
  annualRecurringProfitAfterBreakEven: number;
  monthlyReturnOnSetupCost: number | null;
  annualReturnOnSetupCost: number | null;
  statusLabel: string;
};

const clamp = (value: unknown, min: number, max: number) => {
  const number = toNumber(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
};

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

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

  const contingencyAmount = baseSetupCost * (clamp(setup.oneTimeContingencyPercent, 0, 100) / 100);
  const totalSetupCost = baseSetupCost + contingencyAmount;

  const occupancyFactor = clamp(income.occupancyPercent, 0, 100) / 100;
  const additionalVacancyBufferFactor = 1 - clamp(income.vacancyAllowancePercent, 0, 100) / 100;
  const monthsToFindTenantClamped = clamp(income.monthsToFindTenant, 0, 12);
  const activeRentalMonthsFirstYear = Math.max(0, 12 - monthsToFindTenantClamped);

  const effectiveMonthlyRentOnceOccupied = toNumber(income.expectedMonthlyRent) * occupancyFactor * additionalVacancyBufferFactor;

  const monthlyAddedCosts =
    toNumber(costs.utilitiesIncrease) +
    toNumber(costs.internetIncrease) +
    toNumber(costs.cleaningMonthly) +
    toNumber(costs.maintenanceReserve) +
    toNumber(costs.insuranceIncrease) +
    toNumber(costs.managementHelp) +
    toNumber(costs.supplies) +
    toNumber(costs.otherMonthlyCost);

  const netMonthlyProfitOnceOccupied = effectiveMonthlyRentOnceOccupied + toNumber(income.otherMonthlyIncome) - monthlyAddedCosts;
  const operatingBreakEvenMonths = netMonthlyProfitOnceOccupied > 0 ? totalSetupCost / netMonthlyProfitOnceOccupied : null;
  const calendarBreakEvenMonths = operatingBreakEvenMonths === null ? null : monthsToFindTenantClamped + operatingBreakEvenMonths;
  const firstYearGrossIncome = (effectiveMonthlyRentOnceOccupied + toNumber(income.otherMonthlyIncome)) * activeRentalMonthsFirstYear;
  const firstYearAddedCosts = monthlyAddedCosts * activeRentalMonthsFirstYear;
  const firstYearOperatingProfit = netMonthlyProfitOnceOccupied * activeRentalMonthsFirstYear;
  const firstYearNetAfterSetup = firstYearOperatingProfit - totalSetupCost;
  const annualRecurringProfitAfterBreakEven = netMonthlyProfitOnceOccupied * 12;
  const monthlyReturnOnSetupCost = totalSetupCost > 0 ? netMonthlyProfitOnceOccupied / totalSetupCost : null;
  const annualReturnOnSetupCost = totalSetupCost > 0 ? annualRecurringProfitAfterBreakEven / totalSetupCost : null;

  const statusLabel =
    netMonthlyProfitOnceOccupied <= 0 || operatingBreakEvenMonths === null
      ? "Not recommended as structured"
      : operatingBreakEvenMonths < 6
        ? "Strong opportunity"
        : operatingBreakEvenMonths <= 12
          ? "Reasonable opportunity"
          : operatingBreakEvenMonths <= 24
            ? "Longer payback"
            : "Review carefully";

  return {
    baseSetupCost: finite(baseSetupCost),
    contingencyAmount: finite(contingencyAmount),
    totalSetupCost: finite(totalSetupCost),
    effectiveMonthlyRent: finite(effectiveMonthlyRentOnceOccupied),
    effectiveMonthlyRentOnceOccupied: finite(effectiveMonthlyRentOnceOccupied),
    monthlyAddedCosts: finite(monthlyAddedCosts),
    netMonthlyProfit: finite(netMonthlyProfitOnceOccupied),
    netMonthlyProfitOnceOccupied: finite(netMonthlyProfitOnceOccupied),
    operatingBreakEvenMonths: operatingBreakEvenMonths === null ? null : finite(operatingBreakEvenMonths),
    calendarBreakEvenMonths: calendarBreakEvenMonths === null ? null : finite(calendarBreakEvenMonths),
    breakEvenMonths: operatingBreakEvenMonths === null ? null : finite(operatingBreakEvenMonths),
    activeRentalMonthsFirstYear: finite(activeRentalMonthsFirstYear),
    firstYearGrossIncome: finite(firstYearGrossIncome),
    firstYearAddedCosts: finite(firstYearAddedCosts),
    firstYearOperatingProfit: finite(firstYearOperatingProfit),
    firstYearNet: finite(firstYearNetAfterSetup),
    firstYearNetAfterSetup: finite(firstYearNetAfterSetup),
    annualProfitAfterBreakEven: finite(annualRecurringProfitAfterBreakEven),
    annualRecurringProfitAfterBreakEven: finite(annualRecurringProfitAfterBreakEven),
    monthlyReturnOnSetupCost: monthlyReturnOnSetupCost === null ? null : finite(monthlyReturnOnSetupCost),
    annualReturnOnSetupCost: annualReturnOnSetupCost === null ? null : finite(annualReturnOnSetupCost),
    statusLabel
  };
}
