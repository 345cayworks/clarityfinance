import type { LoanReadinessProfile } from "@/lib/finance/loan-readiness-mapper";

const REQUIRED_DOCS = [
  "hasID",
  "hasProofOfAddress",
  "hasPayslips",
  "hasEmploymentLetter",
  "hasBankStatements",
  "hasDebtStatements",
  "hasCreditReport",
  "hasDownPaymentProof"
] as const;

export function calculateApprovalReadinessScore(profile: LoanReadinessProfile) {
  let score = 0;
  const strengths: string[] = [];
  const risks: string[] = [];
  const missingItems: string[] = [];
  const recommendations: string[] = [];

  if (profile.financials.monthlyIncomeUsed > 0) {
    score += 15;
    strengths.push("Monthly income is documented.");
  } else {
    risks.push("No usable monthly income found.");
    missingItems.push("Monthly income");
    recommendations.push("Add net or gross monthly income details in profile/onboarding.");
  }

  if (profile.financials.monthlySurplus > 0) {
    score += 15;
    strengths.push("Monthly surplus is positive.");
  } else {
    risks.push("Monthly surplus is negative or zero.");
    recommendations.push("Reduce monthly expenses or debt payments to create positive surplus.");
  }

  if (profile.ratios.debtToIncome !== null && profile.ratios.debtToIncome < 0.4) {
    score += 20;
    strengths.push("Debt-to-income ratio is under 40%.");
  } else {
    risks.push("Debt-to-income ratio is high.");
    recommendations.push("Pay down debt balances to improve debt-to-income ratio.");
  }

  if (profile.ratios.housingRatio !== null && profile.ratios.housingRatio < 0.35) {
    score += 10;
    strengths.push("Housing ratio is under 35%.");
  } else {
    risks.push("Housing ratio may be too high for conservative lending thresholds.");
  }

  if (profile.loan.downPaymentAvailable > 0) {
    score += 15;
    strengths.push("Down payment funds are available.");
  } else {
    risks.push("No down payment funds available.");
    missingItems.push("Down payment funds");
    recommendations.push("Build dedicated down payment savings before application.");
  }

  if ((profile.financials.savingsRunwayMonths ?? 0) >= 3) {
    score += 10;
    strengths.push("Savings runway is at least 3 months.");
  } else {
    risks.push("Savings runway is below 3 months.");
    recommendations.push("Increase liquid savings to cover at least 3 months of expenses.");
  }

  const missingDocs = REQUIRED_DOCS.filter((key) => !profile.documents[key]);
  if (missingDocs.length === 0) {
    score += 15;
    strengths.push("Core supporting documents are available.");
  } else {
    risks.push("Required supporting documents are incomplete.");
    missingItems.push(...missingDocs.map((doc) => doc.replace(/^has/, "").replace(/([A-Z])/g, " $1").trim()));
    recommendations.push("Collect all core documents (ID, proof of address, income, bank and debt evidence).");
  }

  const band = score >= 75 ? "Likely Ready" : score >= 50 ? "Needs Review" : "Not Ready Yet";

  return { score, band, strengths, risks, missingItems, recommendations };
}
