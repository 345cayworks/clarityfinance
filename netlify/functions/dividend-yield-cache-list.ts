import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { ensureDividendYieldCacheTable } from "./_dividend_yield_cache";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  await ensureDividendYieldCacheTable();
  const rows = await sql`
    SELECT ticker, company_name, dividend_yield_percent, annual_dividend_per_share, payout_frequency, source, fetched_at, expires_at, updated_at
    FROM dividend_yield_cache
    ORDER BY COALESCE(expires_at, fetched_at, updated_at) ASC
    LIMIT 200
  `;

  return json(200, { success: true, cache: rows });
};
