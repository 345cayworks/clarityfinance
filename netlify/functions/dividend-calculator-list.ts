import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumOrStaff } from "./_access";
import { ensureDividendCalculatorSavesTable } from "./_dividend_calculator_saves";
import { json } from "./_utils";

type SaveListRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  position_count: number;
  summary_preview: Record<string, unknown>;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requirePremiumOrStaff(event);
  if (!access.ok) return json(access.statusCode, access.body);

  await ensureDividendCalculatorSavesTable();
  const saves = await sql`
    SELECT
      id,
      title,
      created_at,
      updated_at,
      jsonb_array_length(positions_json) AS position_count,
      jsonb_build_object(
        'startingPortfolioValue', summary_json -> 'startingPortfolioValue',
        'projectedPortfolioValue', summary_json -> 'projectedPortfolioValue',
        'currentAnnualDividendIncome', summary_json -> 'currentAnnualDividendIncome',
        'projectedAnnualDividendIncome', summary_json -> 'projectedAnnualDividendIncome'
      ) AS summary_preview
    FROM dividend_calculator_saves
    WHERE user_id = ${access.user.id}
    ORDER BY updated_at DESC
  ` as SaveListRow[];

  return json(200, { success: true, saves });
};
