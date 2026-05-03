import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json } from "./_utils";

type HealthItem = {
  key: string;
  label: string;
  status: "healthy" | "attention" | "unavailable";
  detail: string;
  count?: number;
};

async function countQuery(query: Promise<unknown>) {
  const rows = (await query) as Array<{ count: string | number }>;
  return Number(rows[0]?.count ?? 0);
}

async function safeItem(key: string, label: string, run: () => Promise<HealthItem>): Promise<HealthItem> {
  try {
    return await run();
  } catch (error) {
    console.error("admin-health-check item failed", { key, name: error instanceof Error ? error.name : "UnknownError" });
    return { key, label, status: "unavailable", detail: "Check failed. Review function logs." };
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const items = await Promise.all([
    safeItem("database", "Database connection", async () => {
      await sql`SELECT 1`;
      return { key: "database", label: "Database connection", status: "healthy", detail: "Database responded successfully." };
    }),
    safeItem("users", "User accounts", async () => {
      const count = await countQuery(sql`SELECT COUNT(*) FROM users`);
      return { key: "users", label: "User accounts", status: "healthy", detail: `${count} user records found.`, count };
    }),
    safeItem("pending_approvals", "Pending approvals", async () => {
      const count = await countQuery(sql`SELECT COUNT(*) FROM users WHERE approval_status='pending'`);
      return { key: "pending_approvals", label: "Pending approvals", status: count > 0 ? "attention" : "healthy", detail: count > 0 ? `${count} users waiting for review.` : "No pending approvals.", count };
    }),
    safeItem("advisor_requests", "Advisor requests", async () => {
      const count = await countQuery(sql`SELECT COUNT(*) FROM advisor_requests`);
      return { key: "advisor_requests", label: "Advisor requests", status: "healthy", detail: `${count} advisor requests found.`, count };
    }),
    safeItem("unassigned_requests", "Unassigned advisor requests", async () => {
      const count = await countQuery(sql`SELECT COUNT(*) FROM advisor_requests WHERE assigned_advisor_id IS NULL`);
      return { key: "unassigned_requests", label: "Unassigned advisor requests", status: count > 0 ? "attention" : "healthy", detail: count > 0 ? `${count} requests need assignment.` : "All advisor requests are assigned.", count };
    }),
    safeItem("rent_room", "Rent-room scenarios", async () => {
      const count = await countQuery(sql`SELECT COUNT(*) FROM rent_room_scenarios`);
      return { key: "rent_room", label: "Rent-room scenarios", status: "healthy", detail: `${count} saved scenarios found.`, count };
    }),
    safeItem("audit_logs", "Audit logs", async () => {
      const count = await countQuery(sql`SELECT COUNT(*) FROM audit_logs`);
      return { key: "audit_logs", label: "Audit logs", status: "healthy", detail: `${count} audit records found.`, count };
    })
  ]);

  const attentionCount = items.filter((item) => item.status === "attention").length;
  const unavailableCount = items.filter((item) => item.status === "unavailable").length;

  return json(200, {
    status: unavailableCount > 0 ? "attention" : attentionCount > 0 ? "attention" : "healthy",
    checkedAt: new Date().toISOString(),
    items
  });
};
