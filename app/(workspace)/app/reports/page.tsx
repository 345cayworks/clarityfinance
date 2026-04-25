"use client";

import { useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";

export default function ReportsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    const token = await getIdentityToken();

    if (!token) {
      setGenerating(false);
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const response = await fetch("/.netlify/functions/report-create", {
      method: "POST",
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${token}` }
    });
    setGenerating(false);
    if (!response.ok) {
      setError(response.status === 401 ? "Your session has expired. Please sign in again." : "Failed to generate report.");
      return;
    }
    setMessage("Report generated.");
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reports</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Snapshot reports</h1>
        <p className="mt-2 text-sm text-slate-600">
          Build a summary report of your profile snapshot, scores, goals, and recommended action plan. PDF export is
          on the way.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? "Generating…" : "Generate basic report"}
          </button>
          {message ? (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">{message}</span>
          ) : null}
          {error ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">{error}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
