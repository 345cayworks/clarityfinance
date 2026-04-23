import { FinanceData } from "@/types";

const STORAGE_KEY = "clarity-finance-data";
const STORAGE_VERSION = 2;

export const defaultFinanceData: FinanceData = {
  monthlyIncome: 0,
  otherIncome: 0,
  monthlyExpenses: 0,
  savings: 0,
  countryOrMarket: "United States",
  preferredCurrency: "USD",
  employmentType: "full_time",
  dependents: 0,
  targetGoal: "buy_home",
  monthlyHousingCost: 0,
  creditScoreRange: "670-739",
  housingStatus: "renting",
  mortgageBalance: 0,
  mortgageRate: 0,
  mortgagePayment: 0,
  rentAmount: 0,
  estimatedRoomRentalIncome: 0,
  debts: []
};

interface StoredPayload {
  version?: number;
  data?: Partial<FinanceData>;
}

export function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeFinanceData(parsed: Partial<FinanceData>): FinanceData {
  const merged = {
    ...defaultFinanceData,
    ...parsed,
    debts: parsed.debts ?? []
  };

  const inferredHousingCost = merged.monthlyHousingCost || (merged.housingStatus === "homeowner" ? merged.mortgagePayment : merged.rentAmount);
  return {
    ...merged,
    dependents: Number.isFinite(merged.dependents) ? Math.max(0, merged.dependents) : 0,
    monthlyHousingCost: Math.max(0, inferredHousingCost)
  };
}

export function loadFinanceData(): FinanceData {
  if (!isBrowser()) return defaultFinanceData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFinanceData;

    const parsed = JSON.parse(raw) as StoredPayload | Partial<FinanceData>;
    const candidate = parsed && "data" in parsed && parsed.data ? parsed.data : (parsed as Partial<FinanceData>);
    return normalizeFinanceData(candidate ?? {});
  } catch {
    return defaultFinanceData;
  }
}

export function saveFinanceData(data: FinanceData) {
  if (!isBrowser()) return;
  const payload: StoredPayload = { version: STORAGE_VERSION, data };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearFinanceData() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getSampleData(): FinanceData {
  return {
    monthlyIncome: 6200,
    otherIncome: 400,
    monthlyExpenses: 3200,
    savings: 14000,
    countryOrMarket: "United States",
    preferredCurrency: "USD",
    employmentType: "full_time",
    dependents: 1,
    targetGoal: "buy_home",
    monthlyHousingCost: 2150,
    creditScoreRange: "740-799",
    housingStatus: "homeowner",
    mortgageBalance: 295000,
    mortgageRate: 6.4,
    mortgagePayment: 2150,
    rentAmount: 0,
    estimatedRoomRentalIncome: 750,
    debts: [
      { id: crypto.randomUUID(), name: "Credit Card", balance: 5400, interestRate: 22.9, monthlyPayment: 210 },
      { id: crypto.randomUUID(), name: "Car Loan", balance: 11800, interestRate: 6.1, monthlyPayment: 325 }
    ]
  };
}
