import { sql } from "../../lib/db/neon";
import type { IdentityUser } from "./_identity";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AccountStatus = "active" | "inactive" | "deactivated";

type UserApprovalRow = {
  role: string | null;
  approval_status: string | null;
  account_status: string | null;
  last_active_at: string | null;
};

export async function getUserApprovalStatus(identityUser: IdentityUser) {
  const rows = (await sql`
    SELECT role, approval_status, account_status, last_active_at FROM users WHERE email = ${identityUser.email} LIMIT 1
  `) as UserApprovalRow[];

  const role = rows[0]?.role ?? identityUser.role ?? "user";
  const approvalStatus = (rows[0]?.approval_status ?? "pending") as ApprovalStatus;
  const accountStatus = (rows[0]?.account_status ?? "active") as AccountStatus;
  const approved = approvalStatus === "approved";
  const active = accountStatus === "active";

  return { approved, active, approvalStatus, accountStatus, role, lastActiveAt: rows[0]?.last_active_at ?? null };
}
