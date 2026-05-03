import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireActiveUser } from "./_access";
import { json, parseJsonBody, randomId } from "./_utils";

type ProfileRow = Record<string, unknown>;
type IncomeSourceRow = Record<string, unknown>;
type ExpenseProfileRow = Record<string, unknown>;
type DebtRow = Record<string, unknown>;
type HousingProfileRow = Record<string, unknown>;
type SavingsProfileRow = Record<string, unknown>;
type GoalRow = Record<string, unknown>;
type RentRoomRow = Record<string, unknown>;

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

  await sql`
    CREATE INDEX IF NOT EXISTS idx_reports_user_created
    ON reports(user_id, created_at DESC)
  `;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requireActiveUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  await ensureReportsTable();

  const body = parseJsonBody<ReportCreateBody>(event) ?? {};
  const reportType = String(body.reportType ?? "financial_snapshot");
  const title = reportTitles[reportType] ?? "Financial Snapshot";

  const [profile, incomeSources, expenseProfile, debts, housingProfile, savingsProfile, goals, rentRoomScenario] = await Promise.all([
    sql`SELECT * FROM profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<ProfileRow[]>,
    sql`SELECT * FROM income_sources WHERE user_id = ${access.user.id} ORDER BY created_at DESC` as Promise<IncomeSourceRow[]>,
    sql`SELECT * FROM expense_profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<ExpenseProfileRow[]>,
    sql`SELECT * FROM debts WHERE user_id = ${access.user.id} ORDER BY created_at DESC` as Promise<DebtRow[]>,
    sql`SELECT * FROM housing_profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<HousingProfileRow[]>,
    sql`SELECT * FROM savings_profiles WHERE user_id = ${access.user.id} LIMIT 1` as Promise<SavingsProfileRow[]>,
    sql`SELECT * FROM goals WHERE user_id = ${access.user.id} LIMIT 1` as Promise<GoalRow[]>,
    sql`SELECT * FROM rent_room_scenarios WHERE user_id = ${access.user.id} ORDER BY created_at DESC LIMIT 1` as Promise<RentRoomRow[]>
  ]);

  const reportId = randomId("rpt");
  const generatedAt = new Date().toISOString();

  await sql`
    INSERT INTO reports (id, user_id, title, report_json)
    VALUES (
      ${reportId},
      ${access.user.id},
      ${title},
      ${JSON.stringify({
        reportType,
        title,
        profile: profile[0] ?? null,
        incomeSources,
        expenseProfile: expenseProfile[0] ?? null,
        debts,
        housingProfile: housingProfile[0] ?? null,
        savingsProfile: savingsProfile[0] ?? null,
        goals: goals[0] ?? null,
        rentRoomScenario: rentRoomScenario[0] ?? null,
        generatedAt
      })}::jsonb
    )
  `;

  return json(200, { success: true, reportId, reportType, title });
};
