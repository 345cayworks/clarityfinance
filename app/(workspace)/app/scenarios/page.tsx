"use client";

import { type FormEvent, useState } from "react";

export default function ScenariosPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    const response = await fetch("/.netlify/functions/scenario-save", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (!response.ok) {
      setError(response.status === 401 ? "Your session has expired. Please sign in again." : "Failed to save scenario.");
      return;
    }
    setMessage("Scenario saved.");
  }

  const fields: Array<{ name: string; label: string; type?: string }> = [
    { name: "incomeIncrease", label: "Increase income ($/mo)", type: "number" },
    { name: "expenseReduction", label: "Reduce expenses ($/mo)", type: "number" },
    { name: "debtPaydown", label: "Pay down debt ($)", type: "number" },
    { name: "rentalIncome", label: "Add rental income ($/mo)", type: "number" },
    { name: "lowerRate", label: "Lower mortgage rate (%)", type: "number" },
    { name: "savingsIncrease", label: "Increase savings ($/mo)", type: "number" }
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Scenarios</h1>
        <p className="mt-2 text-sm text-slate-600">
          Model what-if changes — income increase, expense reduction, debt payoff, rental income, lower rate, and
          savings boost.
        </p>
      </div>
      <form onSubmit={onSubmit} className="card grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          <span className="mb-1.5 block font-medium text-slate-700">Scenario name</span>
          <input
            name="name"
            placeholder="Boost cash flow by 15%"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {fields.map((field) => (
          <label key={field.name} className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">{field.label}</span>
            <input
              name={field.name}
              type={field.type ?? "text"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        ))}
        <div className="md:col-span-2">
          <button
            disabled={saving}
            className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save scenario"}
          </button>
        </div>
        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 md:col-span-2">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">{message}</p>
        ) : null}
      </form>
    </div>
  );
}
