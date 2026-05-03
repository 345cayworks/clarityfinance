import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";

type ProfileRow = Record<string, unknown>;

type ReportCreateBody = {
  reportType?: string;
};

const reportTitles: Record<string, string> = {
  financial_snapshot: "Financial Snapshot",
  expense_report: "Expense Report",
  bank_loan_readiness: "Bank Loan Readiness Report",
  loan_document_checklist: "Loan Document Checklist",
  rent_a_room_scenario: "Rent a Room Scenario Report",
  savings_cash_flow: "Savings & Cash Flow Report",
  debt_liability: "Debt & Liability Report",
  housing_equity: "Housing & Equity Report"
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const body = parseJsonBody<ReportCreateBody>(event) ?? {};
  const reportType = String(body.reportType ?? "financial_snapshot");
  const title = reportTitles[reportType] ?? "Financial Snapshot";
  const profile = await sql`SELECT * FROM profiles WHERE user_id = ${access.user.id} LIMIT 1` as ProfileRow[];

  await sql`
    INSERT INTO reports (id, user_id, title, report_json)
    VALUES (
      ${randomId("rpt")},
      ${access.user.id},
      ${title},
      ${JSON.stringify({
        reportType,
        title,
        profile: profile[0] ?? null,
        generatedAt: new Date().toISOString()
      })}::jsonb
    )
  `;

  return json(200, { success: true, reportType, title });
};
