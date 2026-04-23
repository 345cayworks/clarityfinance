import { FinanceData } from "@/types";

export const STORAGE_KEY = "clarity-finance-data";
const STORAGE_VERSION = 3;

export const defaultFinanceData: FinanceData = {
  countryOrMarket: "United States",
  preferredCurrency: "USD",
  ageRange: "30-39",
  employmentType: "full_time",
  householdStatus: "single",
  dependents: 0,
  creditScoreKnown: true,
  creditScoreRange: "670-739",

  monthlyIncome: 0,
  otherIncome: 0,
  incomeFrequency: "monthly",
  incomeStability: "stable",
  rentalIncome: 0,
  sideIncome: 0,

  monthlyExpenses: 0,
  monthlyHousingCost: 0,
  utilities: 0,
  transport: 0,
  groceries: 0,
  insurance: 0,
  childcare: 0,
  discretionarySpending: 0,

  housingStatus: "renting",
  rentAmount: 0,
  mortgageBalance: 0,
  mortgageRate: 0,
  mortgagePayment: 0,
  estimatedHomeValue: 0,
  spareRoomAvailable: false,
  estimatedRoomRentalIncome: 0,

  savings: 0,
  targetGoal: "buy_home",
  targetHomePrice: 0,
  targetSavingsGoal: 0,
  targetDebtReduction: 0,
  targetMonthlyCashFlow: 0,
  goalTimeframe: "12_months",

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
  const merged = { ...defaultFinanceData, ...parsed, debts: parsed.debts ?? [] };
  return {
    ...merged,
    monthlyIncome: Number(merged.monthlyIncome) || 0,
    otherIncome: Number(merged.otherIncome) || 0,
    dependents: Math.max(0, Number(merged.dependents) || 0)
  };
}

export function loadLegacyLocalFinanceData(): FinanceData | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredPayload | Partial<FinanceData>;
    const candidate = parsed && "data" in parsed && parsed.data ? parsed.data : (parsed as Partial<FinanceData>);
    return normalizeFinanceData(candidate ?? {});
  } catch {
    return null;
  }
}

export function saveLegacyLocalFinanceData(data: FinanceData) {
  if (!isBrowser()) return;
  const payload: StoredPayload = { version: STORAGE_VERSION, data };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearLegacyLocalFinanceData() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getSampleData(): FinanceData {
  return {
    ...defaultFinanceData,
    monthlyIncome: 6200,
    otherIncome: 400,
    monthlyExpenses: 3200,
    savings: 14000,
    monthlyHousingCost: 2150,
    creditScoreRange: "740-799",
    housingStatus: "homeowner",
    mortgageBalance: 295000,
    mortgageRate: 6.4,
    mortgagePayment: 2150,
    estimatedRoomRentalIncome: 750,
    targetHomePrice: 450000,
    targetSavingsGoal: 35000,
    debts: [
      { id: crypto.randomUUID(), name: "Credit Card", type: "credit_card", balance: 5400, interestRate: 22.9, monthlyPayment: 210 },
      { id: crypto.randomUUID(), name: "Car Loan", type: "auto", balance: 11800, interestRate: 6.1, monthlyPayment: 325 }
    ]
  };
}
