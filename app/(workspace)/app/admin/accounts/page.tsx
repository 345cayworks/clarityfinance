"use client";

import { useEffect, useMemo, useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  approval_status: string | null;
  account_status: string | null;
  last_active_at: string | null;
  last_login_at: string | null;
  deactivated_at: string | null;
  created_at: string;
};

type AdvisorOption = { id: string; name: string | null; email: string; role: string };

type AdvisorRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  urgency: string;
  status: string;
  message?: string;
  created_at: string;
  assigned_advisor_id?: string | null;
  assigned_advisor_email?: string | null;
  assigned_at?: string | null;
  assigned_by?: string | null;
  assigned_advisor_name?: string | null;
};

type TabKey = "action" | "users" | "advisor" | "deactivated" | "invite";

const tabs: { key: TabKey; label: string }[] = [
  { key: "action", label: "🔔 Action Required" },
  { key: "users", label: "👥 Users" },
  { key: "advisor", label: "📥 Advisor Requests" },
  { key: "deactivated", label: "🚫 Deactivated" },
  { key: "invite", label: "➕ Invite User" }
];
const PRIMARY_ADMIN_EMAIL = "info@cayworks.com";
const ROLE_LABELS: Record<string, string> = {
  user: "Standard User",
  premium_user: "Premium User",
  advisor: "Advisor",
  admin: "Admin",
  superadmin: "Superadmin"
};

function Badge({ tone, children }: { tone: string; children: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${tone}`}>{children}</span>;
}

function EmptyState({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="text-2xl">✨</div>
      <p className="mt-2 font-medium text-slate-700">{title}</p>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  );
}

export default function Page() {
  const { user, accountStatus } = useWorkspaceUser();
  const canManageSuperadmin = accountStatus?.role === "superadmin";
  const availableRoleOptions = useMemo(
    () =>
      [
        { value: "user", label: ROLE_LABELS.user },
        { value: "premium_user", label: ROLE_LABELS.premium_user },
        { value: "advisor", label: ROLE_LABELS.advisor },
        { value: "admin", label: ROLE_LABELS.admin },
        ...(canManageSuperadmin ? [{ value: "superadmin", label: ROLE_LABELS.superadmin }] : [])
      ] as Array<{ value: string; label: string }>,
    [canManageSuperadmin]
  );
  const [tab, setTab] = useState<TabKey>("action");
  const [users, setUsers] = useState<User[]>([]);
  const [advisorRequests, setAdvisor] = useState<AdvisorRequest[]>([]);
  const [invite, setInvite] = useState({ name: "", email: "", role: "user" });
  const [advisorOptions, setAdvisorOptions] = useState<AdvisorOption[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [advisorFilter, setAdvisorFilter] = useState<"all"|"unassigned"|"assigned"|"reviewing"|"contacted"|"closed">("all");

  const load = async () => {
    const token = await getIdentityToken(user);
    if (!token) return;
    setLoading(true);
    const r = await fetch("/.netlify/functions/admin-users-list", { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setUsers(d.users ?? []);
    setAdvisor(d.advisorRequests ?? []);
    setRoleDrafts(
      Object.fromEntries(
        (d.users ?? []).map((u: User) => [u.id, u.role || "user"])
      )
    );
    const advisorsResp = await fetch("/.netlify/functions/admin-advisors-list", { headers: { Authorization: `Bearer ${token}` } });
    if (advisorsResp.ok) { const a = await advisorsResp.json(); setAdvisorOptions(a.advisors ?? []); }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  useEffect(() => {
    console.log("advisorOptions:", advisorOptions);
  }, [advisorOptions]);

  const act = async (path: string, payload: Record<string, unknown>, shouldReload = true) => {
    const token = await getIdentityToken(user);
    if (!token) return;
    const response = await fetch(`/.netlify/functions/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (shouldReload) await load();
    return response.ok;
  };

  const pending = useMemo(() => users.filter((u) => u.approval_status === "pending"), [users]);
  const active = useMemo(
    () => users.filter((u) => u.account_status === "active").sort((a, b) => (b.last_active_at || "").localeCompare(a.last_active_at || "")),
    [users]
  );
  const deactivated = useMemo(() => users.filter((u) => u.account_status === "deactivated"), [users]);
  const newAdvisor = useMemo(() => advisorRequests.filter((r) => (r.status || "new") === "new"), [advisorRequests]);

  const prioritizedRequests = useMemo(() => {
    const urgencyScore: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...newAdvisor].sort((a, b) => {
      const urgencyDelta = (urgencyScore[a.urgency] ?? 3) - (urgencyScore[b.urgency] ?? 3);
      if (urgencyDelta !== 0) return urgencyDelta;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [newAdvisor]);

  const highUrgencyCount = prioritizedRequests.filter((r) => r.urgency === "high").length;

  const statusBadge = (status: string | null, type: "approval" | "account" | "role" | "urgency" | "advisor") => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      active: "bg-green-100 text-green-800",
      deactivated: "bg-red-100 text-red-800",
      admin: "bg-purple-100 text-purple-800",
      superadmin: "bg-indigo-100 text-indigo-800",
      advisor: "bg-blue-100 text-blue-800",
      user: "bg-slate-200 text-slate-700",
      premium_user: "bg-emerald-100 text-emerald-800",
      high: "bg-red-100 text-red-800",
      medium: "bg-amber-100 text-amber-800",
      low: "bg-green-100 text-green-800",
      new: "bg-amber-100 text-amber-800",
      reviewing: "bg-blue-100 text-blue-800",
      contacted: "bg-green-100 text-green-800",
      closed: "bg-slate-200 text-slate-700"
    };
    const display = type === "role" ? ROLE_LABELS[status || ""] || status || "-" : status || (type === "approval" ? "pending" : "-");
    return <Badge tone={map[status || ""] || "bg-slate-200 text-slate-700"}>{display}</Badge>;
  };

  const activity = (lastActive: string | null) => {
    if (!lastActive) return { label: "Inactive", tone: "text-red-600", dot: "bg-red-500" };
    const mins = (Date.now() - new Date(lastActive).getTime()) / 60000;
    if (mins <= 5) return { label: "Active now", tone: "text-green-700", dot: "bg-green-500" };
    if (mins <= 1440) return { label: "Active today", tone: "text-amber-700", dot: "bg-amber-500" };
    const days = Math.floor(mins / 1440);
    return { label: `Inactive (${days}d ago)`, tone: "text-red-700", dot: "bg-red-500" };
  };

  if (!["admin","superadmin"].includes(accountStatus?.role || "")) return <div className="card">Admin access required.</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Manage users, approvals, and advisory requests</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Pending Approvals", pending.length, "action"],
          ["Active Users", active.length, "users"],
          ["Advisor Requests", newAdvisor.length, "advisor"],
          ["Deactivated Users", deactivated.length, "deactivated"]
        ].map(([label, count, goto]) => (
          <button key={label as string} className="card text-left hover:border-[#1A3A5F]" onClick={() => setTab(goto as TabKey)}>
            <p className="text-sm text-slate-500">{label as string}</p>
            <p className="text-3xl font-semibold text-[#0A2540]">{count as number}</p>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg border px-3 py-2 text-sm ${tab === t.key ? "border-[#1A3A5F] bg-[#F2F7FC] text-[#0A2540]" : "border-slate-300 text-slate-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}

        {loading && <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />)}</div>}

        {!loading && tab === "action" && (
          <div className="space-y-5">
            <p className="text-sm font-medium text-slate-700">{highUrgencyCount} high urgency requests need attention</p>
            {pending.length === 0 && prioritizedRequests.length === 0 ? (
              <EmptyState title="No pending approvals" helper="You're caught up. New approvals and urgent requests will appear here." />
            ) : (
              <div className="space-y-3">
                {pending.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                    <div>
                      <p className="font-medium">{u.name || "Unnamed user"}</p><p className="text-sm text-slate-500">{u.email}</p>
                      <div className="mt-2 flex gap-2">{statusBadge(u.approval_status, "approval")}{statusBadge(u.role || "user", "role")}</div>
                    </div>
                    <div className="flex gap-2"><button className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => act("admin-user-approve", { userId: u.id })}>Approve</button></div>
                  </div>
                ))}
                {prioritizedRequests.map((r) => (
                  <div key={r.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${r.urgency === "high" ? "border-red-200 bg-red-50" : ""}`}>
                    <div>
                      <p className="font-medium">{r.topic}</p>
                      <p className="text-sm text-slate-500">{(r.message || "").slice(0, 110) || `${r.name} • ${r.email}`}</p>
                      <div className="mt-2 flex gap-2">{statusBadge(r.urgency, "urgency")}{statusBadge(r.status || "new", "advisor")}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded border px-3 py-1" onClick={() => act("admin-advisor-request-update", { id: r.id, status: "reviewing" })}>Mark Reviewing</button>
                      <button className="rounded border px-3 py-1" onClick={() => act("admin-advisor-request-update", { id: r.id, status: "contacted" })}>Mark Contacted</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && tab === "users" && (active.length ? <div className="space-y-3">{active.map((u) => {const a = activity(u.last_active_at); const isPrimaryAdmin = u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL; const selectedRole = roleDrafts[u.id] || u.role || "user"; return <div key={u.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{u.name || "Unnamed user"}</p><p className="text-sm text-slate-500">{u.email}</p></div><div className="flex gap-2">{statusBadge(u.account_status, "account")}{statusBadge(u.role || "user", "role")}{isPrimaryAdmin && <Badge tone="bg-purple-200 text-purple-900">Primary Admin</Badge>}</div></div><div className="mt-2 text-sm text-slate-600"><span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${a.dot}`} /> <span className={a.tone}>{a.label}</span> • Last active: {u.last_active_at ? new Date(u.last_active_at).toLocaleString() : "-"} • Last login: {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "-"}</div><div className="mt-3 flex flex-wrap items-center gap-2"><button className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={isPrimaryAdmin} onClick={() => act("admin-user-deactivate", { userId: u.id })}>Deactivate</button><label className="text-sm text-slate-600">Select Role:</label><select className="rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={isPrimaryAdmin} value={selectedRole} onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}>{availableRoleOptions.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}</select><button className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={isPrimaryAdmin || selectedRole === (u.role || "user")} onClick={async () => {const ok = await act("admin-user-role-update", { userId: u.id, role: selectedRole }, false); if (ok) {setUsers((prev) => prev.map((item) => item.id === u.id ? { ...item, role: selectedRole } : item)); setToast(`Role updated to ${ROLE_LABELS[selectedRole] || selectedRole}`);}}}>Update Role</button></div></div>;})}</div> : <EmptyState title="No active users" helper="Approved users will appear here." />)}

        {!loading && tab === "deactivated" && (deactivated.length ? <div className="space-y-3">{deactivated.map((u) => <div key={u.id} className="rounded-xl border p-4"><p className="font-medium">{u.name || "Unnamed user"}</p><p className="text-sm text-slate-500">{u.email}</p><div className="mt-2 flex gap-2">{statusBadge("deactivated", "account")}{statusBadge(u.role || "user", "role")}</div><p className="mt-2 text-sm text-slate-600">Deactivated: {u.deactivated_at ? new Date(u.deactivated_at).toLocaleString() : "-"}</p><button className="mt-3 rounded bg-green-600 px-3 py-1 text-white" onClick={() => act("admin-user-activate", { userId: u.id })}>Reactivate</button></div>)}</div> : <EmptyState title="No deactivated users" helper="When users are deactivated, they will show here for reactivation." />)}

        {!loading && tab === "advisor" && (() => {
          const filtered = advisorRequests.filter((r) => {
            if (advisorFilter === "all") return true;
            if (advisorFilter === "unassigned") return !r.assigned_advisor_email;
            if (advisorFilter === "assigned") return !!r.assigned_advisor_email;
            return r.status === advisorFilter;
          });

          if (!filtered.length) return <EmptyState title="No advisor requests yet" helper="New advisor requests will appear here." />;

          return (
            <div className="space-y-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {(["all", "unassigned", "assigned", "reviewing", "contacted", "closed"] as const).map((f) => (
                  <button key={f} className={`rounded border px-3 py-1 text-sm ${advisorFilter === f ? "bg-slate-100" : ""}`} onClick={() => setAdvisorFilter(f)}>
                    {f === "all" ? "All Requests" : f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              {filtered.map((r) => {
                const selectedAdvisorId = assignmentDrafts[r.id] || "";
                console.log("selectedAdvisorId:", selectedAdvisorId);
                const selectedAdvisor = advisorOptions.find((a) => a.id === selectedAdvisorId);
                const currentAdvisorName = r.assigned_advisor_name || advisorOptions.find((a) => a.id === r.assigned_advisor_id)?.name || r.assigned_advisor_email;
                return (
                  <div key={r.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{r.name} • {r.topic}</p>
                      <div className="flex gap-2">
                        {r.urgency === "high" && <Badge tone="bg-red-100 text-red-800">High urgency</Badge>}
                        {statusBadge(r.status || "new", "advisor")}
                        {r.assigned_advisor_email ? <Badge tone="bg-green-100 text-green-800">{`Assigned to ${currentAdvisorName || r.assigned_advisor_email}`}</Badge> : <Badge tone="bg-amber-100 text-amber-800">Unassigned</Badge>}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{r.email} • {r.phone}</p>
                    <p className="mt-1 text-sm text-slate-500">{(r.message || "").slice(0, 120)}</p>
                    <p className="mt-2 text-xs text-slate-500">Created: {new Date(r.created_at).toLocaleString()} • Assigned at: {r.assigned_at ? new Date(r.assigned_at).toLocaleString() : "-"} • Assigned by: {r.assigned_by || "-"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <select className="rounded border px-2 py-1 text-sm" value={selectedAdvisorId} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}>
                        <option value="">Assign advisor...</option>
                        {advisorOptions.map((a) => <option key={a.id} value={a.id}>{a.name || a.email} ({a.role})</option>)}
                      </select>
                      <button disabled={!selectedAdvisorId} className="rounded bg-[#0A2540] px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={async () => {
                        if (!selectedAdvisor) {
                          alert("Please select an advisor");
                          return;
                        }
                        const token = await getIdentityToken(user);
                        if (!token) return;
                        const response = await fetch('/.netlify/functions/admin-advisor-request-assign', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ requestId: r.id, advisorId: selectedAdvisor.id, advisorEmail: selectedAdvisor.email }) });
                        if (!response.ok) {
                          const err = await response.json();
                          alert(err.error || "Assignment failed");
                          return;
                        }
                        const data = await response.json();
                        setAdvisor((prev) => prev.map((item) => item.id === r.id ? { ...item, ...data.request, assigned_advisor_name: data.request.advisor_name || selectedAdvisor.name || selectedAdvisor.email } : item));
                        setToast(`Assigned to ${selectedAdvisor.name || selectedAdvisor.email}`);
                        alert(`Assigned to ${selectedAdvisor.email}`);
                      }}>{r.assigned_advisor_email ? "Reassign Advisor" : "Assign"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {!loading && tab === "invite" && (
          <form
            className="mx-auto max-w-xl rounded-xl border p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await act("admin-user-invite", invite);
              setMsg("User added. Send them the signup link or Netlify invite.");
            }}
          >
            <h2 className="mb-3 text-lg font-semibold">Invite User</h2>
            <div className="grid gap-3">
              <input className="rounded border px-3 py-2" placeholder="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="Email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
              <select className="rounded border px-3 py-2" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{availableRoleOptions.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}</select>
              <div className="flex gap-2"><button type="submit" className="rounded bg-[#0A2540] px-3 py-2 text-white">Add User</button><button type="button" className="rounded border px-3 py-2" onClick={() => navigator.clipboard.writeText(`Hi ${invite.name || "there"}, you've been added to ClarityFinance. Please use your email (${invite.email}) to sign up or accept your Netlify invite.`)}>Copy invite message</button></div>
            </div>
            {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
