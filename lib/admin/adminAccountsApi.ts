import { getIdentityToken, type IdentityUser } from "@/lib/auth/netlify-identity";
import type { AdminAdvisorRequestRow, AdminUserRow, AdvisorOption } from "@/lib/types/admin";
import type { UserRole } from "@/lib/types/roles";

type IdentityUser = {
  id?: string;
  email?: string;
  name?: string;
} | null;

type AdminAccountsData = { users: AdminUserRow[]; advisorRequests: AdminAdvisorRequestRow[]; advisors: AdvisorOption[] };

async function getAuthHeader(user: IdentityUser | null) {
  const token = await getIdentityToken(user);
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(`${fallback} (status ${response.status})`);
  return (await response.json()) as T;
}

export async function fetchAdminAccountsData(user: IdentityUser | null): Promise<AdminAccountsData> {
  const headers = await getAuthHeader(user);
  const usersResponse = await fetch("/.netlify/functions/admin-users-list", { headers });
  const usersData = await parseResponse<{ users?: AdminUserRow[]; advisorRequests?: AdminAdvisorRequestRow[] }>(usersResponse, "Failed to load admin accounts data");
  const advisorsResponse = await fetch("/.netlify/functions/admin-advisors-list", { headers });
  const advisorsData = await parseResponse<{ advisors?: AdvisorOption[] }>(advisorsResponse, "Failed to load advisor options");
  return { users: usersData.users ?? [], advisorRequests: usersData.advisorRequests ?? [], advisors: advisorsData.advisors ?? [] };
}

export async function postAdminAction(user: IdentityUser | null, path: string, payload: Record<string, unknown>) {
  const headers = await getAuthHeader(user);
  const response = await fetch(`/.netlify/functions/${path}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  await parseResponse<Record<string, unknown>>(response, "Admin action failed");
}

export const updateAdminUserRole = (user: IdentityUser | null, userId: string, role: UserRole) =>
  postAdminAction(user, "admin-user-role-update", { userId, role });

export const assignAdvisorToRequest = (
  user: IdentityUser | null,
  requestId: string,
  advisorId: string,
  advisorEmail?: string
) =>
  postAdminAction(user, "admin-advisor-request-assign", { requestId, advisorId, advisorEmail });

export const inviteAdminUser = (user: IdentityUser | null, name: string, email: string, role: UserRole) =>
  postAdminAction(user, "admin-user-invite", { name, email, role });
