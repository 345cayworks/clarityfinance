"use client";

import { useEffect, useState } from "react";
import { getIdentityToken, initIdentity } from "@/lib/auth/netlify-identity";

export default function AdminPage() {
  const [role, setRole] = useState<string>("user");

  useEffect(() => {
    const load = async () => {
      await initIdentity();
      const token = await getIdentityToken();
      if (!token) {
        setRole("user");
        return;
      }

      fetch("/.netlify/functions/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => setRole(data?.user?.role ?? "user"))
        .catch(() => setRole("user"));
    };

    load();
  }, []);

  if (role !== "admin") {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-slate-600">You do not have access to the admin workspace.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Admin (Future Ready)</h1>
      <p className="mt-2 text-slate-600">Admin route scaffolded but intentionally minimal for first rebuild.</p>
    </div>
  );
}
