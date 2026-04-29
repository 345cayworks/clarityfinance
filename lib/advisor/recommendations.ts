export function getAdvisorRecommendation(input: Record<string, unknown>): {
  shouldRecommend: boolean;
  urgency: "low" | "medium" | "high";
  package: string;
  reasons: string[];
} {
  const reasons: string[] = [];
  const n = (k:string)=> Number(input[k] ?? 0);
  const s = (k:string)=> String(input[k] ?? "").toLowerCase();
  if (n("approvalScore") < 75 && n("approvalScore") > 0) reasons.push("Approval score below 75");
  if (n("dti") > 0.4) reasons.push("DTI above 40%");
  if (n("housingRatio") > 0.35) reasons.push("Housing ratio above 35%");
  if (n("monthlySurplus") < 0) reasons.push("Monthly surplus is negative");
  if (n("savingsRunwayMonths") > 0 && n("savingsRunwayMonths") < 3) reasons.push("Savings runway below 3 months");
  if (n("missingMajorDocs") > 0) reasons.push("Missing major bank documents");
  if (n("cashOutPaymentIncrease") > 0.2) reasons.push("Cash-out refinance payment increase above 20%");
  const goal = s("goal");
  if (["cash-out refinance","prepare for mortgage","save for home purchase","reduce debt"].includes(goal)) reasons.push("Goal benefits from advisor support");
  const urgency: "low" | "medium" | "high" = reasons.length >= 4 ? "high" : reasons.length >= 2 ? "medium" : "low";
  const pkg = goal.includes("debt") ? "Debt & Cash Flow Review" : goal.includes("refinance") ? "Mortgage / Refinance Review" : reasons.length >= 4 ? "Full Financial Clarity Session" : "Loan Readiness Review";
  return { shouldRecommend: reasons.length > 0, urgency, package: pkg, reasons };
}
