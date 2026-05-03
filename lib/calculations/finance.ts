export type GenericRow = Record<string, unknown>;

export const numberValue = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getMonthlyIncome = (profile: GenericRow | null, incomeSources: GenericRow[] = []) => {
  const sumSources = incomeSources.reduce((s, row) => s + numberValue(row.monthly_amount), 0);
  if (sumSources > 0) return { value: sumSources, source: "incomeSources.monthly_amount" };
  const net = numberValue(profile?.monthly_net_income);
  if (net > 0) return { value: net, source: "profile.monthly_net_income" };
  const gross = numberValue(profile?.monthly_gross_income);
  if (gross > 0) return { value: gross, source: "profile.monthly_gross_income" };
  return { value: 0, source: "fallback.0" };
};

export const getHousingExpense = (housingProfile: GenericRow | null) => {
  const mortgage = numberValue(housingProfile?.mortgage_payment);
  if (mortgage > 0) return { value: mortgage, source: "housingProfile.mortgage_payment" };
  const rent = numberValue(housingProfile?.rent_amount);
  if (rent > 0) return { value: rent, source: "housingProfile.rent_amount" };
  return { value: 0, source: "fallback.0" };
};

export const getNonHousingNonDebtExpenses = (expenseProfile: GenericRow | null) => {
  const value = ["utilities", "transport", "groceries", "insurance", "childcare", "discretionary", "other"].reduce(
    (sum, key) => sum + numberValue(expenseProfile?.[key]),0
  );
  return { value, source: "expenseProfile.non_housing_categories" };
};
export const getMonthlyDebtPayments = (debts: GenericRow[] = []) => debts.reduce((s, d) => s + numberValue(d.monthly_payment), 0);
export const getTotalMonthlyExpenses = (expenseProfile: GenericRow | null, housingProfile: GenericRow | null, debts: GenericRow[] = []) =>
  getHousingExpense(housingProfile).value + getNonHousingNonDebtExpenses(expenseProfile).value + getMonthlyDebtPayments(debts);
export const getTotalMonthlyObligations = (expenseProfile: GenericRow | null, housingProfile: GenericRow | null, debts: GenericRow[] = []) =>
  getTotalMonthlyExpenses(expenseProfile, housingProfile, debts);
export const getMonthlySurplus = (profile: GenericRow | null, incomeSources: GenericRow[] = [], expenseProfile: GenericRow | null, housingProfile: GenericRow | null, debts: GenericRow[] = []) =>
  getMonthlyIncome(profile, incomeSources).value - getTotalMonthlyExpenses(expenseProfile, housingProfile, debts);
export const getDebtToIncomeRatio = (profile: GenericRow | null, incomeSources: GenericRow[] = [], debts: GenericRow[] = []) => {
  const income = getMonthlyIncome(profile, incomeSources).value;
  if (income <= 0) return null;
  return getMonthlyDebtPayments(debts) / income;
};
export const getHousingRatio = (profile: GenericRow | null, incomeSources: GenericRow[] = [], housingProfile: GenericRow | null) => {
  const income = getMonthlyIncome(profile, incomeSources).value;
  if (income <= 0) return null;
  return getHousingExpense(housingProfile).value / income;
};
export const getTotalObligationRatio = (profile: GenericRow | null, incomeSources: GenericRow[] = [], expenseProfile: GenericRow | null, housingProfile: GenericRow | null, debts: GenericRow[] = []) => {
  const income = getMonthlyIncome(profile, incomeSources).value;
  if (income <= 0) return null;
  return getTotalMonthlyExpenses(expenseProfile, housingProfile, debts) / income;
};

export const getTotalDebt = (debts: GenericRow[] = [], housingProfile: GenericRow | null = null) => {
  const mortgageBalance = numberValue(housingProfile?.mortgage_balance);
  return debts.reduce((sum, d) => {
    const type = String(d.type ?? "").toLowerCase();
    if (type === "mortgage" && mortgageBalance > 0) return sum;
    return sum + numberValue(d.balance);
  }, 0);
};

export const getAssets = (savingsProfile: GenericRow | null, housingProfile: GenericRow | null) =>
  numberValue(savingsProfile?.cash_savings) + numberValue(savingsProfile?.emergency_fund) + numberValue(savingsProfile?.down_payment_savings) + numberValue(savingsProfile?.investments) + numberValue(savingsProfile?.retirement_savings) + numberValue(housingProfile?.estimated_home_value) + numberValue(savingsProfile?.other_assets);

export const getLiabilities = (debts: GenericRow[] = [], housingProfile: GenericRow | null = null) =>
  numberValue(housingProfile?.mortgage_balance) + getTotalDebt(debts, housingProfile);
export const getNetWorth = (savingsProfile: GenericRow | null, debts: GenericRow[] = [], housingProfile: GenericRow | null = null) =>
  getAssets(savingsProfile, housingProfile) - getLiabilities(debts, housingProfile);

export const getSavingsRunwayMonths = (savingsProfile: GenericRow | null, expenseProfile: GenericRow | null, housingProfile: GenericRow | null) => {
  const totalLiving = getHousingExpense(housingProfile).value + getNonHousingNonDebtExpenses(expenseProfile).value;
  if (totalLiving <= 0) return 0;
  return (numberValue(savingsProfile?.cash_savings) + numberValue(savingsProfile?.emergency_fund)) / totalLiving;
};

export const formatMoney = (value: number, currency = "USD") => new Intl.NumberFormat("en-US", {style:"currency", currency, maximumFractionDigits: 0}).format(value || 0);
export const formatPercent = (value: number | null) => value === null ? "Missing income" : `${(value * 100).toFixed(1)}%`;
