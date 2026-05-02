import type { AdminAdvisorRequestRow, AdminUserRow } from "@/lib/types/admin";

export function buildAdminMetrics(users: AdminUserRow[], advisorRequests: AdminAdvisorRequestRow[]) {
  return {
    standardUsers: users.filter((u) => u.role === "user").length,
    premiumUsers: users.filter((u) => u.role === "premium_user").length,
    advisors: users.filter((u) => u.role === "advisor").length,
    admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
    pendingUsers: users.filter((u) => u.approval_status === "pending").length,
    unassignedRequests: advisorRequests.filter((r) => !r.assigned_advisor_id && !r.assigned_advisor_email).length
  };
}
