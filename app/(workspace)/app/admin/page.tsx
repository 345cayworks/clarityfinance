"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { getIdentityToken } from "@/lib/auth/netlify-identity";

const commandCards = [
  {
    title: "Manage accounts",
    href: "/app/admin/accounts",
    description: "Review users, roles, approval status, activity, advisor requests, and account operations.",
    action: "Open account dashboard"
  },
  {
    title: "Pending approvals",
    href: "/app/admin/accounts",
    description: "Review newly registered users and keep the approval queue moving.",
    action: "Review approvals"
  },
  {
    title: "Advisor requests",
    href: "/app/admin/accounts",
    description: "Monitor advisor support requests, assignment status, urgency, and case movement.",
    action: "Review requests"
  },
  {
    title: "Notifications",
    href: "/app/admin/notifications",
    description: "Manage admin-facing platform notifications and follow-up workflows.",
    action: "Open notifications"
  }
] as const;

const healthItems = [
  "Account approval workflow",
  "Advisor request queue",
  "User and role visibility",
  "Reports and scenario monitoring"
];

export default function AdminPage() {
  const [role, setRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const { user } = useWorkspaceUser();

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const token = await getIdentityToken(user);
      if (!token) return null;

      const response = await fetch("/.netlify/functions/me", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.ok ? response.json() : null;
    }

    loadUser()
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
  }, [user]);

  if (loading) {
    return <div className="card text-sm text-slate-500">Checking permissions…</div>;
  }

  if (!["admin", "superadmin"].includes(role)) {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Restricted area</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have access to the admin workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#0A2540] to-[#173b63] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Admin command center</p>
        <h1 className="mt-2 text-3xl font-semibold">Run Clarity Finance with confidence.</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-200">
          Monitor users, approvals, advisor requests, account roles, and operational follow-up from one control center.
          Phase 1 focuses on visibility and workflow clarity; Phase 2 will wire more direct admin actions.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {commandCards.map((card) => (
          <Link key={card.title} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
            <h2 className="text-lg font-semibold text-[#0A2540]">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            <p className="mt-4 text-sm font-semibold text-blue-700">{card.action} →</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr,0.8fr]">
        <div className="card">
          <h2 className="text-xl font-semibold text-[#0A2540]">Today’s admin focus</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <FocusCard title="Approve users" body="Keep legitimate new accounts from getting stuck in pending status." />
            <FocusCard title="Assign cases" body="Make sure advisor requests move quickly to the right support person." />
            <FocusCard title="Monitor roles" body="Confirm users, premium users, advisors, admins, and deactivated accounts stay clean." />
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-[#0A2540]">Operational health</h2>
          <div className="mt-4 space-y-2">
            {healthItems.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{item}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">Visible</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FocusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="font-semibold text-[#0A2540]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
