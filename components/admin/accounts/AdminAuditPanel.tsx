"use client";

import { useEffect, useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import { getIdentityToken } from "@/lib/auth/netlify-identity";

type AuditLogRow = {
  id: number;
  actor_email: string | null;
  action: string;
  target_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function labelAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AdminAuditPanel({ currentUser }: { currentUser: IdentityUser | null }) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
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
        const response = await fetch("/.netlify/functions/admin-audit-logs", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Failed to load audit logs (status ${response.status}).`);
        const payload = (await response.json()) as { logs?: AuditLogRow[] };
        if (!cancelled) setLogs(payload.logs ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading audit trail…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Audit trail</h2>
        <p className="text-sm text-slate-600">Recent admin and system actions recorded for accountability.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No audit records found.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="grid gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1.1fr,1fr,1fr,0.9fr]">
              <div>
                <p className="font-semibold text-[#0A2540]">{labelAction(log.action)}</p>
                <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
              </div>
              <p className="text-slate-600"><span className="font-medium text-slate-700">Actor:</span> {log.actor_email ?? "System"}</p>
              <p className="text-slate-600"><span className="font-medium text-slate-700">Target:</span> {log.target_email ?? "—"}</p>
              <p className="text-xs text-slate-500">{log.entity_type ?? "entity"}: {log.entity_id ?? "—"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
