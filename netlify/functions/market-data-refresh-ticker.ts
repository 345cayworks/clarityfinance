import type { Handler } from "@netlify/functions";
import { refreshTickerDailyAdjustedSeries, getLatestTradingDay, normalizeTicker } from "../../lib/market-data/historical-market-data";
import { requireAdmin } from "./_access";
import { json, parseJsonBody } from "./_utils";

type RefreshBody = {
  ticker?: unknown;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<RefreshBody>(event);
  const ticker = normalizeTicker(String(body?.ticker ?? ""));
  if (!ticker || !/^[A-Z0-9.-]{1,12}$/.test(ticker)) return json(400, { error: "Enter a valid ticker." });

  try {
    const series = await refreshTickerDailyAdjustedSeries(ticker);
    const latestTradingDay = getLatestTradingDay(series);
    return json(200, {
      success: true,
      ticker,
      rowsStored: series.length,
      latestTradingDate: latestTradingDay?.date ?? null,
      status: "synced"
    });
  } catch (error) {
    return json(502, {
      success: false,
      ticker,
      rowsStored: 0,
      latestTradingDate: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unable to refresh market data."
    });
  }
};
