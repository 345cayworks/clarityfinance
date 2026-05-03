"use client";

import { useEffect, useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import { getIdentityToken } from "@/lib/auth/netlify-identity";

type HealthItem = {
  key: string;
  label: string;
  status: "healthy" | "attention" | "unavailable";
  detail: string;
  count?: number;
};

type HealthPayload = {
  status: "healthy" | "attention";
  checkedAt: string;
  items: HealthItem[];
};

function tone(status: HealthItem["status"]) {
  if (status === "healthy") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "attention") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

export function AdminHealthPanel({ currentUser }: { currentUser: IdentityUser | null }) {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
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
        const response = await fetch("/.netlify/functions/admin-health-check", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Failed to load health check (status ${response.status}).`);
        const data = (await response.json()) as HealthPayload;
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load health check.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [currentUser]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Checking system health…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!payload) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">System health</h2>
          <p className="text-sm text-slate-600">Operational status for core database-backed workflows.</p>
        </div>
        <p className="text-xs text-slate-500">Checked {new Date(payload.checkedAt).toLocaleString()}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {payload.items.map((item) => (
          <div key={item.key} className={`rounded-2xl border p-4 ${tone(item.status)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm opacity-90">{item.detail}</p>
              </div>
              <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold uppercase">{item.status}</span>
            </div>
            {typeof item.count === "number" ? <p className="mt-3 text-2xl font-semibold">{item.count}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
