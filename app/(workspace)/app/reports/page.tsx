"use client";

import { useState } from "react";
import { getIdentityToken, initIdentity } from "@/lib/auth/netlify-identity";

export default function ReportsPage() {
  const [message, setMessage] = useState("");

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-slate-600">Build a summary report of profile snapshot, scores, goals, and recommended action plan. PDF export is a placeholder.</p>
      <button
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        onClick={async () => {
          await initIdentity();
          const token = await getIdentityToken();
          if (!token) {
            setMessage("Please log in again.");
            return;
          }

          const response = await fetch("/.netlify/functions/report-create", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessage(response.ok ? "Report generated." : "Failed to generate report.");
        }}
      >
        Generate basic report
      </button>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
