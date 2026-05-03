import type { HandlerEvent } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser, type IdentityUser } from "./_identity";
import { getUserApprovalStatus, type AccountStatus, type ApprovalStatus } from "./_approval";

export type AccessUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  approvalStatus: ApprovalStatus;
  accountStatus: AccountStatus;
  approved: boolean;
  active: boolean;
};

export async function getCurrentUser(event: HandlerEvent): Promise<AccessUser | null> {
  const identityUser = await getIdentityUser(event);
  if (!identityUser) return null;
  return hydrateAccessUser(identityUser);
}

async function hydrateAccessUser(identityUser: IdentityUser): Promise<AccessUser> {
  const approval = await getUserApprovalStatus(identityUser);
  const existingUserByEmail = (await sql`SELECT id FROM users WHERE email = ${identityUser.email} LIMIT 1`) as Array<{ id: string }>;
  return {
    id: existingUserByEmail[0]?.id ?? identityUser.id,
    email: identityUser.email,
    name: identityUser.name,
    role: approval.role ?? identityUser.role,
    approvalStatus: approval.approvalStatus,
    accountStatus: approval.accountStatus,
    approved: approval.approved,
    active: approval.active
  };
}

export async function requireAuth(event: HandlerEvent) {
  const user = await getCurrentUser(event);
  if (!user) return { ok: false as const, statusCode: 401, body: { error: "Unauthorized" } };
  return { ok: true as const, user };
}

export async function requireActiveUser(event: HandlerEvent) {
  const auth = await requireAuth(event);
  if (!auth.ok) return auth;
  if (!auth.user.approved || !auth.user.active) return { ok: false as const, statusCode: 403, body: { error: "Account pending approval." } };
  return auth;
}

export async function requirePremiumUser(event: HandlerEvent) {
  const active = await requireActiveUser(event);
  if (!active.ok) return active;
  // Canonical premium role is `premium_user`. `premium` was considered as a legacy alias but is not valid in the live UserRole enum.
  if (!["premium_user", "admin", "superadmin"].includes(active.user.role)) {
    return { ok: false as const, statusCode: 403, body: { error: "Premium membership required." } };
  }
  return active;
}

export async function requireAdvisor(event: HandlerEvent) {
  const active = await requireActiveUser(event);
  if (!active.ok) return active;
  if (!["advisor", "admin", "superadmin"].includes(active.user.role)) return { ok: false as const, statusCode: 403, body: { error: "Forbidden" } };
  return active;
}

export async function requireAdmin(event: HandlerEvent) {
  const active = await requireActiveUser(event);
  if (!active.ok) return active;
  if (!["admin", "superadmin"].includes(active.user.role)) return { ok: false as const, statusCode: 403, body: { error: "Forbidden" } };
  return active;
}

export async function requireAssignedAdvisorOrAdmin(
  event: HandlerEvent,
  assignment: { assignedAdvisorEmail?: string | null; assignedAdvisorId?: string | null } | string | null | undefined
) {
  const advisor = await requireAdvisor(event);
  if (!advisor.ok) return advisor;
  if (["admin", "superadmin"].includes(advisor.user.role)) return advisor;
  const assignedAdvisorEmail = typeof assignment === "string" ? assignment : assignment?.assignedAdvisorEmail;
  const assignedAdvisorId = typeof assignment === "string" ? null : assignment?.assignedAdvisorId;
  const emailMatch = assignedAdvisorEmail && assignedAdvisorEmail.toLowerCase() === advisor.user.email.toLowerCase();
  const idMatch = assignedAdvisorId && assignedAdvisorId === advisor.user.id;
  if (!emailMatch && !idMatch) {
    return { ok: false as const, statusCode: 403, body: { error: "Forbidden" } };
  }
  return advisor;
}
