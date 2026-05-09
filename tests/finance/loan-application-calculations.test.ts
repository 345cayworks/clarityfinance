import { describe, expect, it } from "vitest";
import {
  getLoanApplicationTotalIncome,
  getMonthlyDebtPayments,
  getMonthlySurplus,
  getNonHousingNonDebtExpenses,
  getTotalMonthlyExpenses
} from "@/lib/calculations/finance";
import { buildLoanReadinessProfile, type LoanReadinessPayload } from "@/lib/finance/loan-readiness-mapper";

const payload = (overrides: Partial<LoanReadinessPayload> = {}): LoanReadinessPayload => ({
  profile: {
    monthly_net_income: 5000,
    investment_income: 250,
    other_income_amount: 150
  },
  incomeSources: [
    { type: "salary", label: "Primary salary", monthly_amount: 5000 },
    { type: "rental", label: "Room rental", monthly_amount: 700 },
    { type: "investment", label: "Dividends", monthly_amount: 250 },
    { type: "other", label: "Side income", monthly_amount: 150 }
  ],
  expenseProfile: {
    housing: 9999,
    utilities: 300,
    water: 50,
    transport: 400,
    groceries: 700,
    insurance: 250,
    childcare: 100,
    entertainment: 175,
    travel: 225,
    discretionary: 300,
    other: 200
  },
  debts: [
    { type: "personal loan", balance: 5000, monthly_payment: 350 },
    { type: "credit card", balance: 2000, monthly_payment: 150 }
  ],
  housingProfile: {
    rent_amount: 1200,
    mortgage_payment: 0,
    estimated_room_rental_income: 700
  },
  savingsProfile: null,
  goals: null,
  ...overrides
});

describe("loan application and expense calculations", () => {
  it("includes applicant, rental, investment, and other income without double-counting categorized sources", () => {
    const data = payload();
    const income = getLoanApplicationTotalIncome(data.profile, data.incomeSources, data.housingProfile, data.savingsProfile);

    expect(income.applicantIncome).toBe(5000);
    expect(income.rentalIncome).toBe(700);
    expect(income.investmentIncome).toBe(250);
    expect(income.otherIncome).toBe(150);
    expect(income.totalIncome).toBe(6100);
  });

  it("uses uncategorized income sources as applicant income when profile income is missing", () => {
    const data = payload({
      profile: null,
      incomeSources: [
        { type: "salary", monthly_amount: 4500 },
        { type: "rental", monthly_amount: 600 },
        { type: "other", monthly_amount: 100 }
      ],
      housingProfile: { estimated_room_rental_income: 0 }
    });

    const income = getLoanApplicationTotalIncome(data.profile, data.incomeSources, data.housingProfile, data.savingsProfile);

    expect(income.applicantIncome).toBe(4500);
    expect(income.rentalIncome).toBe(600);
    expect(income.otherIncome).toBe(100);
    expect(income.totalIncome).toBe(5200);
  });

  it("includes water, entertainment, and travel in non-housing living expenses", () => {
    const data = payload();

    expect(getNonHousingNonDebtExpenses(data.expenseProfile).value).toBe(2700);
  });

  it("excludes housing and debt from non-housing living expenses", () => {
    const data = payload();

    expect(getNonHousingNonDebtExpenses(data.expenseProfile).value).not.toBe(2700 + 9999 + 500);
  });

  it("calculates total obligations and monthly surplus", () => {
    const data = payload();

    expect(getMonthlyDebtPayments(data.debts)).toBe(500);
    expect(getTotalMonthlyExpenses(data.expenseProfile, data.housingProfile, data.debts)).toBe(4400);
    expect(getMonthlySurplus(data.profile, data.incomeSources, data.expenseProfile, data.housingProfile, data.debts)).toBe(1700);
  });

  it("uses total loan-application income for DTI, housing ratio, and total monthly pressure", () => {
    const readiness = buildLoanReadinessProfile(payload());

    expect(readiness.ratios.debtToIncomeUsingTotalIncome).toBeCloseTo(500 / 6100);
    expect(readiness.ratios.housingRatioUsingTotalIncome).toBeCloseTo(1200 / 6100);
    expect(readiness.ratios.totalObligationsRatioUsingTotalIncome).toBeCloseTo(4400 / 6100);
  });

  it("returns safe 0/null values for missing financial data", () => {
    const data = payload({
      profile: null,
      incomeSources: [],
      expenseProfile: null,
      debts: [],
      housingProfile: null
    });
    const readiness = buildLoanReadinessProfile(data);

    expect(getNonHousingNonDebtExpenses(null).value).toBe(0);
    expect(getTotalMonthlyExpenses(null, null, [])).toBe(0);
    expect(readiness.financials.totalMonthlyIncome).toBe(0);
    expect(readiness.ratios.debtToIncomeUsingTotalIncome).toBeNull();
    expect(readiness.ratios.housingRatioUsingTotalIncome).toBeNull();
    expect(readiness.ratios.totalObligationsRatioUsingTotalIncome).toBeNull();
    expect(Number.isFinite(readiness.financials.totalMonthlyObligations)).toBe(true);
  });
});
