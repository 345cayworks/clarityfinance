import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json } from "./_utils";

type CountRow = { label: string | null; count: string | number };
type AdvisorLoadRow = {
  advisor_id: string | null;
  advisor_email: string | null;
  advisor_name: string | null;
  open_cases: string | number;
  closed_cases: string | number;
  total_cases: string | number;
};

function mapCounts(rows: CountRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.label ?? "unknown"] = Number(row.count ?? 0);
    return acc;
  }, {});
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  try {
    const [roleRows, approvalRows, accountRows, requestStatusRows, requestUrgencyRows, advisorLoadRows, recentSignupRows] = await Promise.all([
      sql`SELECT COALESCE(role, 'unknown') AS label, COUNT(*) FROM users GROUP BY COALESCE(role, 'unknown') ORDER BY COUNT(*) DESC` as Promise<CountRow[]>,
      sql`SELECT COALESCE(approval_status, 'unknown') AS label, COUNT(*) FROM users GROUP BY COALESCE(approval_status, 'unknown') ORDER BY COUNT(*) DESC` as Promise<CountRow[]>,
      sql`SELECT COALESCE(account_status, 'unknown') AS label, COUNT(*) FROM users GROUP BY COALESCE(account_status, 'unknown') ORDER BY COUNT(*) DESC` as Promise<CountRow[]>,
      sql`SELECT COALESCE(status, 'unknown') AS label, COUNT(*) FROM advisor_requests GROUP BY COALESCE(status, 'unknown') ORDER BY COUNT(*) DESC` as Promise<CountRow[]>,
      sql`SELECT COALESCE(urgency, 'normal') AS label, COUNT(*) FROM advisor_requests GROUP BY COALESCE(urgency, 'normal') ORDER BY COUNT(*) DESC` as Promise<CountRow[]>,
      sql`
        SELECT
          ar.assigned_advisor_id AS advisor_id,
          ar.assigned_advisor_email AS advisor_email,
          u.name AS advisor_name,
          COUNT(*) FILTER (WHERE COALESCE(ar.status, '') <> 'closed') AS open_cases,
          COUNT(*) FILTER (WHERE ar.status = 'closed') AS closed_cases,
          COUNT(*) AS total_cases
        FROM advisor_requests ar
        LEFT JOIN users u ON u.id = ar.assigned_advisor_id
        WHERE ar.assigned_advisor_id IS NOT NULL OR ar.assigned_advisor_email IS NOT NULL
        GROUP BY ar.assigned_advisor_id, ar.assigned_advisor_email, u.name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ` as Promise<AdvisorLoadRow[]>,
      sql`
        SELECT to_char(created_at::date, 'YYYY-MM-DD') AS label, COUNT(*)
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY created_at::date
        ORDER BY created_at::date DESC
        LIMIT 30
      ` as Promise<CountRow[]>
    ]);

    const totalUsers = Object.values(mapCounts(roleRows)).reduce((sum, value) => sum + value, 0);
    const approvalCounts = mapCounts(approvalRows);
    const requestStatusCounts = mapCounts(requestStatusRows);
    const unassignedRequests = Number((await sql`SELECT COUNT(*) FROM advisor_requests WHERE assigned_advisor_id IS NULL`)?.[0]?.count ?? 0);

    return json(200, {
      generatedAt: new Date().toISOString(),
      totals: {
        users: totalUsers,
        pendingApprovals: approvalCounts.pending ?? 0,
        advisorRequests: Object.values(requestStatusCounts).reduce((sum, value) => sum + value, 0),
        unassignedRequests
      },
      users: {
        byRole: mapCounts(roleRows),
        byApprovalStatus: approvalCounts,
        byAccountStatus: mapCounts(accountRows),
        recentSignups: recentSignupRows.map((row) => ({ date: row.label, count: Number(row.count ?? 0) }))
      },
      advisorRequests: {
        byStatus: requestStatusCounts,
        byUrgency: mapCounts(requestUrgencyRows),
        workload: advisorLoadRows.map((row) => ({
          advisorId: row.advisor_id,
          advisorEmail: row.advisor_email,
          advisorName: row.advisor_name,
          openCases: Number(row.open_cases ?? 0),
          closedCases: Number(row.closed_cases ?? 0),
          totalCases: Number(row.total_cases ?? 0)
        }))
      }
    });
  } catch (error) {
    console.error("admin-intelligence failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return json(500, { error: "Failed to load admin intelligence." });
  }
};
