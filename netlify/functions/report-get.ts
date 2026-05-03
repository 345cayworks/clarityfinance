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

async function ensureReportsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      title text NOT NULL,
      report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const reportId = event.queryStringParameters?.id;
  if (!reportId) return json(400, { error: "Missing report id" });

  await ensureReportsTable();

  const rows = await sql`
    SELECT id, title, report_json, created_at
    FROM reports
    WHERE id = ${reportId}
      AND user_id = ${access.user.id}
    LIMIT 1
  ` as ReportRow[];

  const report = rows[0];
  if (!report) return json(404, { error: "Report not found" });

  return json(200, {
    report: {
      id: report.id,
      title: report.title,
      reportType: String(report.report_json?.reportType ?? "financial_snapshot"),
      generatedAt: report.created_at ?? report.report_json?.generatedAt ?? null,
      reportJson: report.report_json ?? {}
    }
  });
};
