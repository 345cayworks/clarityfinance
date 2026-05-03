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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [advisorFilter, setAdvisorFilter] = useState<AdvisorRequestFilter>("all");
  const [userFilter, setUserFilter] = useState<UserActivityFilter>("all");

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

  return <div className="space-y-6"><div className="card"><h1 className="text-2xl font-semibold text-[#0A2540]">Admin Dashboard</h1></div><div className="card"><AdminTabs tab={tab} onChange={setTab} />{toast ? <p className="mb-2 text-sm text-red-700">{toast}</p> : null}{tab==="overview" && <AdminOverviewPanel metrics={metrics as unknown as Record<string, number>} />}{tab==="users" && <AdminUsersPanel users={users} />}{tab==="advisor" && <AdminAdvisorRequestsPanel advisorRequests={advisorRequests} />}{tab==="approvals" && <AdminApprovalsPanel users={users} />}{tab==="deactivated" && <AdminDeactivatedUsersPanel users={users} />}{tab==="invite" && <AdminInviteUserPanel inviteMessage={inviteMessage} setInviteMessage={setInviteMessage} />}</div></div>;
}
