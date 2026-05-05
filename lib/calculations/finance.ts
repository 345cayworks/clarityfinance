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

export type RetirementIncomeDurationInput = {
  startingBalance: number;
  monthlyWithdrawal: number;
  inflationRatePercent: number;
  annualGrowthRatePercent: number;
  maxProjectionYears?: number;
};

export type RetirementIncomeDurationProjectionRow = {
  year: number;
  startingBalance: number;
  growthAmount: number;
  withdrawalAmount: number;
  endingBalance: number;
  cumulativeWithdrawn: number;
};

export type RetirementIncomeDurationResult = {
  totalMonths: number;
  years: number;
  months: number;
  lastsBeyondProjection: boolean;
  firstYearWithdrawal: number;
  finalYearWithdrawal: number;
  totalWithdrawn: number;
  growthAdjustedDurationLabel: string;
  projectionRows: RetirementIncomeDurationProjectionRow[];
  warnings: string[];
};

export function formatRetirementDuration(totalMonths: number, lastsBeyondProjection = false) {
  if (lastsBeyondProjection) return "60+ years";
  const safeMonths = Math.max(0, Math.floor(Number.isFinite(totalMonths) ? totalMonths : 0));
  const years = Math.floor(safeMonths / 12);
  const months = safeMonths % 12;
  if (years === 0) return `${months} ${months === 1 ? "month" : "months"}`;
  if (months === 0) return `${years} ${years === 1 ? "year" : "years"}`;
  return `${years} ${years === 1 ? "year" : "years"}, ${months} ${months === 1 ? "month" : "months"}`;
}

export function calculateRetirementIncomeDuration({
  startingBalance,
  monthlyWithdrawal,
  inflationRatePercent,
  annualGrowthRatePercent,
  maxProjectionYears = 60
}: RetirementIncomeDurationInput): RetirementIncomeDurationResult {
  const balanceInput = numberValue(startingBalance);
  const withdrawalInput = numberValue(monthlyWithdrawal);
  const inflationInput = numberValue(inflationRatePercent);
  const growthInput = numberValue(annualGrowthRatePercent);
  const projectionCap = Math.max(1, Math.floor(numberValue(maxProjectionYears) || 60));
  const warnings: string[] = [];

  if (balanceInput <= 0) warnings.push("Enter a retirement balance greater than 0 to estimate income duration.");
  if (withdrawalInput <= 0) warnings.push("Enter a planned monthly retirement income greater than 0.");
  if (inflationInput < 0) warnings.push("Annual inflation adjustment cannot be negative.");
  if (growthInput < 0) warnings.push("Expected annual growth during retirement cannot be negative.");

  const firstYearWithdrawal = withdrawalInput > 0 ? withdrawalInput * 12 : 0;
  if (firstYearWithdrawal > balanceInput && balanceInput > 0) {
    warnings.push("Your planned first-year withdrawal is greater than your starting retirement balance. Your funds may last less than one year.");
  }
  if (inflationInput > growthInput && withdrawalInput > 0 && balanceInput > 0) {
    warnings.push("Inflation is higher than the expected growth rate, which may shorten how long your funds last.");
  }

  if (balanceInput <= 0 || withdrawalInput <= 0 || inflationInput < 0 || growthInput < 0) {
    return {
      totalMonths: 0,
      years: 0,
      months: 0,
      lastsBeyondProjection: false,
      firstYearWithdrawal,
      finalYearWithdrawal: firstYearWithdrawal,
      totalWithdrawn: 0,
      growthAdjustedDurationLabel: formatRetirementDuration(0),
      projectionRows: [],
      warnings
    };
  }

  const inflationRate = inflationInput / 100;
  const annualGrowthRate = growthInput / 100;
  let balance = balanceInput;
  let currentAnnualWithdrawal = firstYearWithdrawal;
  let totalWithdrawn = 0;
  let totalMonths = 0;
  const projectionRows: RetirementIncomeDurationProjectionRow[] = [];

  for (let year = 0; balance > 0 && year < projectionCap; year += 1) {
    const displayYear = year + 1;
    const startingBalanceForYear = balance;
    const growthAmount = balance * annualGrowthRate;
    const balanceAfterGrowth = balance + growthAmount;

    if (balanceAfterGrowth >= currentAnnualWithdrawal) {
      const endingBalance = balanceAfterGrowth - currentAnnualWithdrawal;
      totalWithdrawn += currentAnnualWithdrawal;
      totalMonths = displayYear * 12;
      projectionRows.push({
        year: displayYear,
        startingBalance: startingBalanceForYear,
        growthAmount,
        withdrawalAmount: currentAnnualWithdrawal,
        endingBalance,
        cumulativeWithdrawn: totalWithdrawn
      });
      balance = endingBalance;
      currentAnnualWithdrawal *= 1 + inflationRate;
    } else {
      const monthlyWithdrawalFinalYear = currentAnnualWithdrawal / 12;
      const monthsCovered = Math.min(11, Math.max(0, Math.floor(balanceAfterGrowth / monthlyWithdrawalFinalYear)));
      const partialWithdrawal = monthsCovered * monthlyWithdrawalFinalYear;
      totalWithdrawn += partialWithdrawal;
      totalMonths = year * 12 + monthsCovered;
      projectionRows.push({
        year: displayYear,
        startingBalance: startingBalanceForYear,
        growthAmount,
        withdrawalAmount: partialWithdrawal,
        endingBalance: Math.max(0, balanceAfterGrowth - partialWithdrawal),
        cumulativeWithdrawn: totalWithdrawn
      });
      balance = 0;
      break;
    }
  }

  const lastsBeyondProjection = balance > 0;
  if (lastsBeyondProjection) {
    totalMonths = projectionCap * 12;
    warnings.push("Your balance lasts beyond the 60-year projection window based on these assumptions.");
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return {
    totalMonths,
    years,
    months,
    lastsBeyondProjection,
    firstYearWithdrawal,
    finalYearWithdrawal: projectionRows[projectionRows.length - 1]?.withdrawalAmount ?? firstYearWithdrawal,
    totalWithdrawn,
    growthAdjustedDurationLabel: formatRetirementDuration(totalMonths, lastsBeyondProjection),
    projectionRows,
    warnings
  };
}
