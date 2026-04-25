"use client";

import { useState } from "react";

export default function ActionPlanPage() {
  const [message, setMessage] = useState("");

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Action Plan</h1>
      <p className="mt-2 text-slate-600">Generate a practical 30-day, 90-day, and 12-month roadmap.</p>
      <button
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        onClick={async () => {
          const response = await fetch("/.netlify/functions/action-plan-generate", { method: "POST" });
          setMessage(response.ok ? "Action plan generated." : "Failed to generate action plan.");
        }}
      >
        Generate action plan
      </button>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
