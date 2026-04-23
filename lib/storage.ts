import { FinanceData } from "@/types";

const STORAGE_KEY = "clarity-finance-data";

export const defaultFinanceData: FinanceData = {
  monthlyIncome: 0,
  otherIncome: 0,
  monthlyExpenses: 0,
  savings: 0,
  creditScoreRange: "670-739",
  housingStatus: "renting",
  mortgageBalance: 0,
  mortgageRate: 0,
  mortgagePayment: 0,
  rentAmount: 0,
  estimatedRoomRentalIncome: 0,
  debts: []
};

export function isBrowser() {
  return typeof window !== "undefined";
}

export function loadFinanceData(): FinanceData {
  if (!isBrowser()) return defaultFinanceData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFinanceData;
    const parsed = JSON.parse(raw) as Partial<FinanceData>;
    return {
      ...defaultFinanceData,
      ...parsed,
      debts: parsed.debts ?? []
    };
  } catch {
    return defaultFinanceData;
  }
}

export function saveFinanceData(data: FinanceData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
