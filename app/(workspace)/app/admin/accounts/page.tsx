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

type TabKey = "analytics" | "action" | "users" | "advisor" | "deactivated" | "invite";
type UserFilter = "all" | "pending" | "recently_active" | "recently_inactive";

const tabs: { key: TabKey; label: string }[] = [
  { key: "analytics", label: "📊 Analytics" },
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

const isInLastDays = (iso: string | null | undefined, days: number) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
};

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
  const [tab, setTab] = useState<TabKey>("analytics");
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
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");

  const load = async () => {
    const token = await getIdentityToken(user);
    if (!token) return;
    setLoading(true);
    const r = await fetch("/.netlify/functions/admin-users-list", { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setUsers(d.users ?? []);
    setAdvisor(d.advisorRequests ?? []);
    setRoleDrafts(Object.fromEntries((d.users ?? []).map((u: User) => [u.id, u.role || "user"])));
    const advisorsResp = await fetch("/.netlify/functions/admin-advisors-list", { headers: { Authorization: `Bearer ${token}` } });
    if (advisorsResp.ok) {
      const a = await advisorsResp.json();
      setAdvisorOptions(a.advisors ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

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
  const activeUsers = useMemo(() => users.filter((u) => u.account_status === "active"), [users]);
  const deactivated = useMemo(() => users.filter((u) => u.account_status === "deactivated"), [users]);
  const newAdvisor = useMemo(() => advisorRequests.filter((r) => (r.status || "new") === "new"), [advisorRequests]);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const metrics = useMemo(() => {
    const standardUsers = users.filter((u) => u.role === "user");
    const premiumUsers = users.filter((u) => u.role === "premium_user");
    const advisors = users.filter((u) => u.role === "advisor");
    const admins = users.filter((u) => u.role === "admin" || u.role === "superadmin");
    const recentlyActive = users.filter((u) => u.last_active_at && new Date(u.last_active_at).getTime() >= oneDayAgo);
    const recentlyInactive = users.filter((u) => !u.last_active_at || new Date(u.last_active_at).getTime() < sevenDaysAgo);
    const unassigned = advisorRequests.filter((r) => !r.assigned_advisor_email && !r.assigned_advisor_id);
    const reviewing = advisorRequests.filter((r) => r.status === "reviewing");
    const contacted = advisorRequests.filter((r) => r.status === "contacted");
    const closed = advisorRequests.filter((r) => r.status === "closed");
    const highUrgency = advisorRequests.filter((r) => r.urgency === "high");

    const unassignedAges = unassigned.map((r) => (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60));
    const oldestUnassignedHours = unassignedAges.length ? Math.max(...unassignedAges) : null;

    const assignmentDurations = advisorRequests
      .filter((r) => r.assigned_at)
      .map((r) => new Date(r.assigned_at as string).getTime() - new Date(r.created_at).getTime())
      .filter((n) => Number.isFinite(n) && n >= 0);
    const avgAssignmentHours = assignmentDurations.length ? assignmentDurations.reduce((a, b) => a + b, 0) / assignmentDurations.length / (1000 * 60 * 60) : null;

    const newUsersThisWeek = users.filter((u) => isInLastDays(u.created_at, 7)).length;
    const newUsersPrevWeek = users.filter((u) => {
      const t = new Date(u.created_at).getTime();
      return t < sevenDaysAgo && t >= fourteenDaysAgo;
    }).length;
    const advisorThisWeek = advisorRequests.filter((r) => isInLastDays(r.created_at, 7)).length;
    const advisorPrevWeek = advisorRequests.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t < sevenDaysAgo && t >= fourteenDaysAgo;
    }).length;

    return { standardUsers, premiumUsers, advisors, admins, recentlyActive, recentlyInactive, unassigned, reviewing, contacted, closed, highUrgency, oldestUnassignedHours, avgAssignmentHours, newUsersThisWeek, newUsersPrevWeek, advisorThisWeek, advisorPrevWeek };
  }, [advisorRequests, users, oneDayAgo, sevenDaysAgo, fourteenDaysAgo]);

  const statusBadge = (status: string | null, type: "approval" | "account" | "role" | "urgency" | "advisor") => {
    const map: Record<string, string> = { pending: "bg-amber-100 text-amber-800", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", active: "bg-green-100 text-green-800", deactivated: "bg-red-100 text-red-800", admin: "bg-purple-100 text-purple-800", superadmin: "bg-indigo-100 text-indigo-800", advisor: "bg-blue-100 text-blue-800", user: "bg-slate-200 text-slate-700", premium_user: "bg-emerald-100 text-emerald-800", high: "bg-red-100 text-red-800", medium: "bg-amber-100 text-amber-800", low: "bg-green-100 text-green-800", new: "bg-amber-100 text-amber-800", reviewing: "bg-blue-100 text-blue-800", contacted: "bg-green-100 text-green-800", closed: "bg-slate-200 text-slate-700" };
    const display = type === "role" ? ROLE_LABELS[status || ""] || status || "-" : status || (type === "approval" ? "pending" : "-");
    return <Badge tone={map[status || ""] || "bg-slate-200 text-slate-700"}>{display}</Badge>;
  };

  if (!["admin", "superadmin"].includes(accountStatus?.role || "")) return <div className="card">Admin access required.</div>;

  const funnelStages = [
    { label: "Total Users", count: users.length },
    { label: "Standard Users", count: metrics.standardUsers.length },
    { label: "Premium Users", count: metrics.premiumUsers.length },
    { label: "Loan Readiness Started", count: null as number | null },
    { label: "Loan Readiness Report Generated / Loan Ready", count: null as number | null },
    { label: "Advisor Review Requested", count: advisorRequests.length },
    { label: "Advisor Assigned", count: advisorRequests.filter((r) => r.assigned_advisor_email || r.assigned_advisor_id).length },
    { label: "Review Closed", count: metrics.closed.length }
  ];

  const filteredUsers = activeUsers.filter((u) => {
    if (roleFilter !== "all" && (u.role || "user") !== roleFilter) return false;
    if (userFilter === "pending") return u.approval_status === "pending";
    if (userFilter === "recently_active") return !!u.last_active_at && new Date(u.last_active_at).getTime() >= oneDayAgo;
    if (userFilter === "recently_inactive") return !u.last_active_at || new Date(u.last_active_at).getTime() < sevenDaysAgo;
    return true;
  });

  return <div className="space-y-6">
    <div className="card"><h1 className="text-2xl font-semibold text-[#0A2540]">Admin Dashboard</h1><p className="mt-1 text-sm text-slate-600">Manage users, approvals, advisor workflow, and analytics</p></div>
    <div className="card">
      <div className="mb-4 flex flex-wrap gap-2">{tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg border px-3 py-2 text-sm ${tab === t.key ? "border-[#1A3A5F] bg-[#F2F7FC] text-[#0A2540]" : "border-slate-300 text-slate-600"}`}>{t.label}</button>)}</div>
      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {loading && <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />)}</div>}

      {!loading && tab === "analytics" && <div className="space-y-6">
        <section className="space-y-3"><h2 className="text-lg font-semibold">Admin HUD Summary</h2>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[{label:"All Users",count:users.length,go:()=>{setTab("users");setRoleFilter("all");setUserFilter("all");}},
              {label:"Standard Users",count:metrics.standardUsers.length,go:()=>{setTab("users");setRoleFilter("user");}},
              {label:"Premium Users",count:metrics.premiumUsers.length,go:()=>{setTab("users");setRoleFilter("premium_user");}},
              {label:"Advisors",count:metrics.advisors.length,go:()=>{setTab("users");setRoleFilter("advisor");}},
              {label:"Admins",count:metrics.admins.length,go:()=>{setTab("users");setRoleFilter("admin");}},
              {label:"Pending Users",count:pending.length,go:()=>{setTab("action");}},
              {label:"Active Users",count:activeUsers.length,go:()=>{setTab("users");setUserFilter("all");}},
              {label:"Deactivated Users",count:deactivated.length,go:()=>{setTab("deactivated");}},
              {label:"Recently Active",count:metrics.recentlyActive.length,go:()=>{setTab("users");setUserFilter("recently_active");}},
              {label:"Recently Inactive",count:metrics.recentlyInactive.length,go:()=>{setTab("users");setUserFilter("recently_inactive");}},
              {label:"Advisor Requests",count:advisorRequests.length,go:()=>{setTab("advisor");setAdvisorFilter("all");}},
              {label:"Unassigned Advisor Requests",count:metrics.unassigned.length,go:()=>{setTab("advisor");setAdvisorFilter("unassigned");}},
              {label:"Reviewing Requests",count:metrics.reviewing.length,go:()=>{setTab("advisor");setAdvisorFilter("reviewing");}},
              {label:"Contacted Requests",count:metrics.contacted.length,go:()=>{setTab("advisor");setAdvisorFilter("contacted");}},
              {label:"Closed Requests",count:metrics.closed.length,go:()=>{setTab("advisor");setAdvisorFilter("closed");}}].map((card)=> <button key={card.label} className="rounded border p-3 text-left hover:bg-slate-50" onClick={card.go}><p className="text-xs text-slate-500">{card.label}</p><p className="text-2xl font-semibold">{card.count}</p></button>)}
          </div>
        </section>

        <section><h2 className="text-lg font-semibold">Quick Actions</h2><div className="mt-2 flex flex-wrap gap-2 text-sm">
          <button className="rounded border px-3 py-2" onClick={() => { setTab("action"); }}>Review Pending</button>
          <button className="rounded border px-3 py-2" onClick={() => { setTab("users"); setRoleFilter("premium_user"); }}>View Premium</button>
          <button className="rounded border px-3 py-2" onClick={() => { setTab("users"); setUserFilter("recently_inactive"); }}>View Inactive</button>
          <button className="rounded border px-3 py-2" onClick={() => { setTab("advisor"); setAdvisorFilter("unassigned"); }}>View Unassigned</button>
          <button className="rounded border px-3 py-2" onClick={() => { setTab("deactivated"); }}>View Deactivated</button>
          <button className="rounded border px-3 py-2 opacity-60" disabled>Coming Soon</button>
        </div></section>

        <section><h2 className="text-lg font-semibold">Conversion Funnel</h2>
          <p className="text-sm text-slate-500">Loan readiness data not available yet.</p>
          <div className="mt-2 space-y-2">{funnelStages.map((stage, idx) => {
            const pctTotal = stage.count === null || users.length === 0 ? "Not enough data yet" : `${((stage.count / users.length) * 100).toFixed(1)}% of total`;
            const prev = idx > 0 ? funnelStages[idx - 1].count : null;
            const pctPrev = stage.count === null || prev === null || prev === 0 ? "Not enough data yet" : `${((stage.count / prev) * 100).toFixed(1)}% from previous`;
            return <div key={stage.label} className="rounded border p-3 text-sm"><p className="font-medium">{idx + 1}. {stage.label}</p><p>Count: <strong>{stage.count === null ? "Not enough data yet" : stage.count}</strong></p><p className="text-slate-600">{pctTotal} · {idx===0?"-":pctPrev}</p></div>;
          })}</div>
        </section>

        <section><h2 className="text-lg font-semibold">Advisor Operations Snapshot</h2><div className="mt-2 grid gap-2 md:grid-cols-2 text-sm">
          <div>Total advisor requests: <strong>{advisorRequests.length}</strong></div><div>Unassigned: <strong>{metrics.unassigned.length}</strong></div><div>Reviewing: <strong>{metrics.reviewing.length}</strong></div><div>Contacted: <strong>{metrics.contacted.length}</strong></div><div>Closed: <strong>{metrics.closed.length}</strong></div><div>High urgency: <strong>{metrics.highUrgency.length}</strong></div><div>Oldest unassigned request age: <strong>{metrics.oldestUnassignedHours ? `${metrics.oldestUnassignedHours.toFixed(1)}h` : "-"}</strong></div><div>Average Time to Assignment: <strong>{metrics.avgAssignmentHours ? `${metrics.avgAssignmentHours.toFixed(1)}h` : "Insufficient history"}</strong></div>
        </div></section>

        <section><h2 className="text-lg font-semibold">Trend Indicators</h2><div className="mt-2 grid gap-2 md:grid-cols-2 text-sm">
          <div>New users in last 7 days: <strong>{metrics.newUsersThisWeek}</strong> ({metrics.newUsersThisWeek === metrics.newUsersPrevWeek ? "No change" : `Up from ${metrics.newUsersPrevWeek} last week`})</div>
          <div>Advisor requests in last 7 days: <strong>{metrics.advisorThisWeek}</strong> ({metrics.advisorThisWeek === metrics.advisorPrevWeek ? "No change" : `Up from ${metrics.advisorPrevWeek} last week`})</div>
          <div>Current premium users: <strong>{metrics.premiumUsers.length}</strong> (Insufficient history for weekly premium conversions)</div>
          <div>Active users in last 24 hours: <strong>{metrics.recentlyActive.length}</strong> · Inactive users older than 7 days: <strong>{metrics.recentlyInactive.length}</strong></div>
        </div></section>
      </div>}

      {!loading && tab === "action" && <div className="space-y-3">{pending.length === 0 && !newAdvisor.length ? <EmptyState title="No pending approvals" helper="You're caught up." /> : <>{pending.map((u) => <div key={u.id} className="rounded border p-3"><p className="font-medium">{u.name || "Unnamed user"}</p><p className="text-sm text-slate-500">{u.email}</p><button className="mt-2 rounded bg-green-600 px-3 py-1 text-white" onClick={() => act("admin-user-approve", { userId: u.id })}>Approve</button></div>)}{newAdvisor.map((r) => <div key={r.id} className="rounded border p-3"><p className="font-medium">{r.topic}</p><p className="text-sm">{r.email}</p></div>)}</>}</div>}

      {!loading && tab === "users" && (filteredUsers.length ? <div className="space-y-2"><div className="flex gap-2 text-sm"><select className="rounded border px-2 py-1" value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value)}><option value="all">All Roles</option>{availableRoleOptions.map((r)=><option key={r.value} value={r.value}>{r.label}</option>)}</select><select className="rounded border px-2 py-1" value={userFilter} onChange={(e)=>setUserFilter(e.target.value as UserFilter)}><option value="all">All Activity</option><option value="pending">Pending Users</option><option value="recently_active">Recently Active</option><option value="recently_inactive">Recently Inactive</option></select></div>{filteredUsers.map((u)=>{const selectedRole=roleDrafts[u.id]||u.role||"user";const isPrimary=u.email.toLowerCase()===PRIMARY_ADMIN_EMAIL;return <div key={u.id} className="rounded border p-3"><p className="font-medium">{u.name || "Unnamed user"}</p><p className="text-sm text-slate-500">{u.email}</p><div className="mt-2 flex gap-2">{statusBadge(u.account_status,"account")}{statusBadge(u.role || "user","role")}</div><div className="mt-2 flex gap-2"><button className="rounded border px-2 py-1 disabled:opacity-50" disabled={isPrimary} onClick={()=>act("admin-user-deactivate",{userId:u.id})}>Deactivate</button><select className="rounded border px-2 py-1" value={selectedRole} onChange={(e)=>setRoleDrafts((p)=>({...p,[u.id]:e.target.value}))}>{availableRoleOptions.map((r)=><option key={r.value} value={r.value}>{r.label}</option>)}</select><button className="rounded border px-2 py-1 disabled:opacity-50" disabled={selectedRole===(u.role||"user")} onClick={async()=>{const ok=await act("admin-user-role-update",{userId:u.id,role:selectedRole},false); if(ok){setUsers((prev)=>prev.map((it)=>it.id===u.id?{...it,role:selectedRole}:it));}}}>Update Role</button></div></div>;})}</div> : <EmptyState title={roleFilter==="premium_user"?"No Premium Users found.":userFilter==="recently_inactive"?"No Recently Inactive Users found.":"No active users"} helper="Try a different filter." />)}

      {!loading && tab === "deactivated" && (deactivated.length ? <div className="space-y-2">{deactivated.map((u)=><div key={u.id} className="rounded border p-3"><p className="font-medium">{u.name || "Unnamed user"}</p><p className="text-sm">{u.email}</p><button className="mt-2 rounded bg-green-600 px-3 py-1 text-white" onClick={()=>act("admin-user-activate",{userId:u.id})}>Reactivate</button></div>)}</div> : <EmptyState title="No deactivated users" helper="When users are deactivated, they will show here." />)}

      {!loading && tab === "advisor" && (()=>{const filtered=advisorRequests.filter((r)=>{if(advisorFilter==="all")return true; if(advisorFilter==="unassigned")return !r.assigned_advisor_email&&!r.assigned_advisor_id; if(advisorFilter==="assigned")return !!(r.assigned_advisor_email||r.assigned_advisor_id); return r.status===advisorFilter;}); if(!filtered.length)return <EmptyState title={advisorFilter==="unassigned"?"No Unassigned Advisor Requests found.":"No advisor requests yet"} helper="New advisor requests will appear here." />; return <div className="space-y-2"><div className="flex flex-wrap gap-2 text-sm">{(["all","unassigned","assigned","reviewing","contacted","closed"] as const).map((f)=><button key={f} className={`rounded border px-3 py-1 ${advisorFilter===f?"bg-slate-100":""}`} onClick={()=>setAdvisorFilter(f)}>{f==="all"?"All Requests":f[0].toUpperCase()+f.slice(1)}</button>)}</div>{filtered.map((r)=>{const selectedAdvisorId=assignmentDrafts[r.id]||"";const selectedAdvisor=advisorOptions.find((a)=>a.id===selectedAdvisorId); return <div key={r.id} className="rounded border p-3"><p className="font-medium">{r.name} • {r.topic}</p><p className="text-sm">{r.email}</p><div className="mt-2 flex gap-2">{statusBadge(r.status||"new","advisor")} {!r.assigned_advisor_email && !r.assigned_advisor_id ? <Badge tone="bg-amber-100 text-amber-800">Unassigned</Badge> : <Badge tone="bg-green-100 text-green-800">Assigned</Badge>}</div><div className="mt-2 flex gap-2"><select className="rounded border px-2 py-1 text-sm" value={selectedAdvisorId} onChange={(e)=>setAssignmentDrafts((p)=>({...p,[r.id]:e.target.value}))}><option value="">Assign advisor...</option>{advisorOptions.map((a)=><option key={a.id} value={a.id}>{a.name || a.email}</option>)}</select><button disabled={!selectedAdvisorId} className="rounded bg-[#0A2540] px-3 py-1 text-white disabled:opacity-60" onClick={async()=>{if(!selectedAdvisor)return; const token=await getIdentityToken(user); if(!token)return; const response=await fetch('/.netlify/functions/admin-advisor-request-assign',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({requestId:r.id,advisorId:selectedAdvisor.id,advisorEmail:selectedAdvisor.email})}); if(!response.ok)return; const data=await response.json(); setAdvisor((prev)=>prev.map((item)=>item.id===r.id?{...item,...data.request}:item));}}>{r.assigned_advisor_email?"Reassign Advisor":"Assign"}</button></div></div>;})}</div>;})()}

      {!loading && tab === "invite" && <form className="mx-auto max-w-xl rounded-xl border p-4" onSubmit={async (e) => { e.preventDefault(); await act("admin-user-invite", invite); setMsg("User added. Send signup link."); }}><h2 className="mb-3 text-lg font-semibold">Invite User</h2><div className="grid gap-3"><input className="rounded border px-3 py-2" placeholder="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} /><input className="rounded border px-3 py-2" placeholder="Email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /><select className="rounded border px-3 py-2" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{availableRoleOptions.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}</select><button type="submit" className="rounded bg-[#0A2540] px-3 py-2 text-white">Add User</button></div>{msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}</form>}
    </div>
  </div>;
}
