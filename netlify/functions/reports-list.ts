import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json } from "./_utils";

type ReportRow = {
  id: string;
  title: string;
  report_json: Record<string, unknown> | null;
  created_at: string | null;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const rows = await sql`
    SELECT id, title, report_json, created_at
    FROM reports
    WHERE user_id = ${access.user.id}
    ORDER BY created_at DESC
    LIMIT 50
  ` as ReportRow[];

  return json(200, {
    reports: rows.map((report) => ({
      id: report.id,
      title: report.title,
      reportType: String(report.report_json?.reportType ?? "financial_snapshot"),
      generatedAt: report.created_at ?? report.report_json?.generatedAt ?? null
    }))
  });
};
