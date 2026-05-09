import type { Handler } from "@netlify/functions";
import { analyzeInvestmentBasket, normalizeTickerInput, validateInvestmentAnalysisRequest } from "../../lib/market-data/investment-analyzer";
import { requirePremiumOrStaff } from "./_access";
import { json, parseJsonBody } from "./_utils";

type AnalyzeBody = {
  tickers?: unknown;
  historicalDate?: unknown;
  spendAmount?: unknown;
};

function parseTickers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return normalizeTickerInput(value.map((item) => String(item ?? "")));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const access = await requirePremiumOrStaff(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<AnalyzeBody>(event);
  if (!body) return json(400, { error: "Invalid request body." });

  const request = {
    tickers: parseTickers(body.tickers),
    historicalDate: String(body.historicalDate ?? ""),
    spendAmount: Number(body.spendAmount ?? 0)
  };
  const errors = validateInvestmentAnalysisRequest(request);
  if (errors.length > 0) return json(400, { error: errors[0], errors });

  try {
    const result = await analyzeInvestmentBasket(request);
    return json(200, result);
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Unable to analyze investment basket."
    });
  }
};
