"use client";

import { useState } from "react";

const horizons = [
  {
    title: "30-day plan",
    summary: "High-leverage moves you can make this month — automate savings, audit categories, accelerate one debt payment."
  },
  {
    title: "90-day plan",
    summary: "Lower a debt APR, boost income by 5%, refresh your budget after the first 30 days of data."
  },
  {
    title: "12-month plan",
    summary: "Reach your emergency fund target and increase net cash flow by 20% by year-end."
  }
];

export default function ActionPlanPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/.netlify/functions/action-plan-generate", {
      method: "POST",
      credentials: "same-origin"
    });
    setGenerating(false);
    if (!response.ok) {
      setError(response.status === 401 ? "Your session has expired. Please sign in again." : "Failed to generate action plan.");
      return;
    }
    setMessage("Action plan generated. Check your reports for the latest version.");
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Roadmap</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Action Plan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Generate a practical 30-day, 90-day, and 12-month roadmap based on your current profile.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? "Generating…" : "Generate action plan"}
          </button>
          {message ? (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">{message}</span>
          ) : null}
          {error ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">{error}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {horizons.map((horizon) => (
          <div key={horizon.title} className="card">
            <h2 className="text-lg font-semibold text-[#0A2540]">{horizon.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{horizon.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
