"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [role, setRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/.netlify/functions/me", { credentials: "same-origin" })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data: { user?: { role?: string } } | null) => {
        if (cancelled) return;
        setRole(data?.user?.role ?? "user");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRole("user");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="card text-sm text-slate-500">Checking permissions…</div>;
  }

  if (role !== "admin") {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Restricted area</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have access to the admin workspace.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Admin</h1>
      <p className="mt-2 text-sm text-slate-600">Admin route scaffolded but intentionally minimal for first rebuild.</p>
    </div>
  );
}
