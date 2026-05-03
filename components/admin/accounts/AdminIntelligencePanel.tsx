"use client";

import { useEffect, useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import { getIdentityToken } from "@/lib/auth/netlify-identity";

type IntelligencePayload = {
  generatedAt: string;
  totals: {
    users: number;
    pendingApprovals: number;
    advisorRequests: number;
    unassignedRequests: number;
  };
  users: {
    byRole: Record<string, number>;
    byApprovalStatus: Record<string, number>;
    byAccountStatus: Record<string, number>;
    recentSignups: Array<{ date: string | null; count: number }>;
  };
  advisorRequests: {
    byStatus: Record<string, number>;
    byUrgency: Record<string, number>;
    workload: Array<{
      advisorId: string | null;
      advisorEmail: string | null;
      advisorName: string | null;
      openCases: number;
      closedCases: number;
      totalCases: number;
    }>;
  };
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function CountList({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-[#0A2540]">{title}</h3>
      <div className="mt-3 space-y-2">
        {entries.length === 0 ? <p className="text-sm text-slate-500">No data yet.</p> : entries.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-700">{formatLabel(label)}</span>
            <span className="font-semibold text-[#0A2540]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminIntelligencePanel({ currentUser }: { currentUser: IdentityUser | null }) {
  const [payload, setPayload] = useState<IntelligencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = await getIdentityToken(currentUser);
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        const response = await fetch("/.netlify/functions/admin-intelligence", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Failed to load admin intelligence (status ${response.status}).`);
        const data = (await response.json()) as IntelligencePayload;
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load admin intelligence.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [currentUser]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading admin intelligence…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!payload) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Admin intelligence</h2>
          <p className="text-sm text-slate-600">Operational insight across users, approvals, advisor requests, and workload.</p>
        </div>
        <p className="text-xs text-slate-500">Generated {new Date(payload.generatedAt).toLocaleString()}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Total users" value={payload.totals.users} />
        <Kpi label="Pending approvals" value={payload.totals.pendingApprovals} tone="amber" />
        <Kpi label="Advisor requests" value={payload.totals.advisorRequests} tone="blue" />
        <Kpi label="Unassigned requests" value={payload.totals.unassignedRequests} tone={payload.totals.unassignedRequests > 0 ? "red" : "green"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CountList title="Users by role" data={payload.users.byRole} />
        <CountList title="Approval status" data={payload.users.byApprovalStatus} />
        <CountList title="Advisor request status" data={payload.advisorRequests.byStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-[#0A2540]">Advisor workload</h3>
          <div className="mt-3 space-y-2">
            {payload.advisorRequests.workload.length === 0 ? <p className="text-sm text-slate-500">No assigned advisor cases yet.</p> : payload.advisorRequests.workload.map((advisor) => (
              <div key={advisor.advisorId ?? advisor.advisorEmail ?? "unknown"} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0A2540]">{advisor.advisorName || advisor.advisorEmail || "Unassigned advisor"}</p>
                    <p className="text-xs text-slate-500">{advisor.advisorEmail}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">{advisor.totalCases} total</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p>Open: <strong>{advisor.openCases}</strong></p>
                  <p>Closed: <strong>{advisor.closedCases}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-[#0A2540]">Recent signups</h3>
          <div className="mt-3 space-y-2">
            {payload.users.recentSignups.length === 0 ? <p className="text-sm text-slate-500">No recent signups.</p> : payload.users.recentSignups.slice(0, 10).map((row) => (
              <div key={row.date ?? "unknown"} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{row.date ?? "Unknown date"}</span>
                <span className="font-semibold text-[#0A2540]">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "blue" | "amber" | "red" | "green" }) {
  const classes = {
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800"
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
