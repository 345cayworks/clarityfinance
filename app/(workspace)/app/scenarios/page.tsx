"use client";

import { FormEvent, useState } from "react";
import { getIdentityToken, initIdentity } from "@/lib/auth/netlify-identity";

export default function ScenariosPage() {
  const [message, setMessage] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    await initIdentity();
    const token = await getIdentityToken();
    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    const response = await fetch("/.netlify/functions/scenario-save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    setMessage(response.ok ? "Scenario saved." : "Failed to save scenario.");
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Scenarios</h1>
      <p className="text-sm text-slate-600 mt-2">Model what-if changes: income increase, expense reduction, debt payoff, rental income, lower rates, and savings boost.</p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <input name="name" placeholder="Scenario name" className="rounded-lg border p-2 md:col-span-2" />
        <input name="incomeIncrease" type="number" placeholder="Increase income" className="rounded-lg border p-2" />
        <input name="expenseReduction" type="number" placeholder="Reduce expenses" className="rounded-lg border p-2" />
        <input name="debtPaydown" type="number" placeholder="Pay down debt" className="rounded-lg border p-2" />
        <input name="rentalIncome" type="number" placeholder="Add rental income" className="rounded-lg border p-2" />
        <input name="lowerRate" type="number" placeholder="Lower mortgage rate" className="rounded-lg border p-2" />
        <input name="savingsIncrease" type="number" placeholder="Increase savings" className="rounded-lg border p-2" />
        <button className="rounded-lg bg-blue-600 p-2 text-white md:col-span-2">Save scenario</button>
      </form>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
