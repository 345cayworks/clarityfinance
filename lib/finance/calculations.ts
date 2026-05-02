import {
  numberValue,
  getMonthlyIncome,
  getHousingExpense,
  getNonHousingNonDebtExpenses,
  getMonthlyDebtPayments,
  getTotalMonthlyExpenses,
  getMonthlySurplus,
  getDebtToIncomeRatio,
  getHousingRatio,
  getTotalObligationRatio,
  getTotalDebt,
  getAssets,
  getLiabilities,
  getNetWorth,
  getSavingsRunwayMonths,
  formatMoney,
  formatPercent
} from "@/lib/calculations/finance";

export const getNonHousingLivingExpenses = getNonHousingNonDebtExpenses;

export const getTotalLivingExpenses = (
  expenseProfile,
  housingProfile,
  debts = []
) => getTotalMonthlyExpenses(expenseProfile, housingProfile, debts);

export {
  numberValue as toNumber,
  getMonthlyIncome,
  getHousingExpense,
  getMonthlyDebtPayments,
  getTotalMonthlyExpenses,
  getMonthlySurplus,
  getDebtToIncomeRatio,
  getHousingRatio,
  getTotalObligationRatio,
  getTotalDebt,
  getAssets,
  getLiabilities,
  getNetWorth,
  getSavingsRunwayMonths,
  formatMoney as toCurrency,
  formatPercent
};
