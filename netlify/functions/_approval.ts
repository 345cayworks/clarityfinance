import { sql } from "../../lib/db/neon";
import type { IdentityUser } from "./_identity";

export type ApprovalStatus = "pending" | "approved" | "rejected";

type UserApprovalRow = {
  role: string | null;
  approval_status: string | null;
};

export async function getUserApprovalStatus(identityUser: IdentityUser): Promise<{
  approved: boolean;
  approvalStatus: ApprovalStatus;
  role: string;
}> {
  const rows = (await sql`
    SELECT role, approval_status FROM users WHERE email = ${identityUser.email} LIMIT 1
  `) as UserApprovalRow[];

  const role = rows[0]?.role ?? identityUser.role ?? "user";
  const status = (rows[0]?.approval_status ?? "pending") as ApprovalStatus;

  if (role === "admin" || role === "advisor") {
    return { approved: true, approvalStatus: "approved", role };
  }

  if (status !== "approved") {
    return { approved: false, approvalStatus: status, role };
  }

  return { approved: true, approvalStatus: "approved", role };
}

export function isIdentityAdmin(identityRole: string | null | undefined) {
  return identityRole === "admin";
}
