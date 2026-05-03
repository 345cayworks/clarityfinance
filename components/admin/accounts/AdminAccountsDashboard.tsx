"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { isAdminRole } from "@/lib/types/roles";
import type { AdminAdvisorRequestRow, AdminUserRow } from "@/lib/types/admin";
import type { AdvisorRequestFilter, RoleFilter, UserActivityFilter } from "@/lib/admin/adminAccountsFilters";
import { fetchAdminAccountsData } from "@/lib/admin/adminAccountsApi";
import { buildAdminMetrics } from "@/lib/admin/adminAccountsMetrics";
import { AdminTabs, type AdminTabKey } from "@/components/admin/accounts/AdminTabs";
import { AdminOverviewPanel } from "@/components/admin/accounts/AdminOverviewPanel";
import { AdminUsersPanel } from "@/components/admin/accounts/AdminUsersPanel";
import { AdminAdvisorRequestsPanel } from "@/components/admin/accounts/AdminAdvisorRequestsPanel";
import { AdminApprovalsPanel } from "@/components/admin/accounts/AdminApprovalsPanel";
import { AdminDeactivatedUsersPanel } from "@/components/admin/accounts/AdminDeactivatedUsersPanel";
import { AdminInviteUserPanel } from "@/components/admin/accounts/AdminInviteUserPanel";

export function AdminAccountsDashboard() {
  const { user, accountStatus } = useWorkspaceUser();
  const [tab, setTab] = useState<AdminTabKey>("overview");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [advisorRequests, setAdvisorRequests] = useState<AdminAdvisorRequestRow[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [toast, setToast] = useState("");
  const [roleFilter] = useState<RoleFilter>("all");
  const [advisorFilter] = useState<AdvisorRequestFilter>("all");
  const [userFilter] = useState<UserActivityFilter>("all");

  const loadAdminAccountsData = useCallback(async () => {
    try {
      const data = await fetchAdminAccountsData(user);
      setUsers(data.users);
      setAdvisorRequests(data.advisorRequests);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to load admin data.");
    }
  }, [user]);

  useEffect(() => {
    void loadAdminAccountsData();
  }, [loadAdminAccountsData]);

  const metrics = useMemo(() => buildAdminMetrics(users, advisorRequests), [users, advisorRequests]);

  if (!isAdminRole(accountStatus?.role)) return <div className="card">Admin access required.</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Manage users, approvals, advisor requests, invitations, and account support workflows.</p>
      </div>
      <div className="card">
        <AdminTabs tab={tab} onChange={setTab} />
        {toast ? <p className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{toast}</p> : null}
        {tab === "overview" && <AdminOverviewPanel metrics={metrics as unknown as Record<string, number>} />}
        {tab === "users" && <AdminUsersPanel users={users} currentUser={user} onRefresh={loadAdminAccountsData} />}
        {tab === "advisor" && <AdminAdvisorRequestsPanel advisorRequests={advisorRequests} />}
        {tab === "approvals" && <AdminApprovalsPanel users={users} currentUser={user} onRefresh={loadAdminAccountsData} />}
        {tab === "deactivated" && <AdminDeactivatedUsersPanel users={users} />}
        {tab === "invite" && <AdminInviteUserPanel inviteMessage={inviteMessage} setInviteMessage={setInviteMessage} />}
      </div>
      <p className="text-xs text-slate-400">Filters reserved for Phase 2+: role={roleFilter}, user={userFilter}, advisor={advisorFilter}</p>
    </div>
  );
}
