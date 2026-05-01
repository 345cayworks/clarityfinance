"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

export default function AdvisorRequestDetailPage() {
  const { user } = useWorkspaceUser();
  const params = useParams<{ requestId: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const token = await getIdentityToken(user);
      if (!token || !params?.requestId) return;
      const r = await fetch(`/.netlify/functions/advisor-request-detail?requestId=${params.requestId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Unable to load request"); return; }
      setData(d.request || null);
    };
    void run();
  }, [user, params?.requestId]);

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Loading…</div>;

  const render = (label: string, key: string) => <p><span className="font-medium">{label}:</span> {String(data[key] ?? "-")}</p>;

  return <div className="card space-y-2"><h1 className="text-xl font-semibold">Advisor Request Detail</h1>{render("Client", "name")}{render("Email", "email")}{render("Phone", "phone")}{render("Topic", "topic")}{render("Urgency", "urgency")}{render("Status", "status")}{render("Assigned advisor email", "assigned_advisor_email")}{render("Assigned advisor id", "assigned_advisor_id")}{render("Assigned at", "assigned_at")}{render("Assigned by", "assigned_by")}{render("Created at", "created_at")}{render("Updated at", "updated_at")}<p><span className="font-medium">Message:</span> {String(data.message ?? "-")}</p><p><span className="font-medium">Advisor notes:</span> {String(data.advisor_notes ?? "-")}</p><p><span className="font-medium">Prequalification URL:</span> {String(data.prequalification_share_url ?? "-")}</p><p><span className="font-medium">Source context:</span> {JSON.stringify(data.source_context ?? null)}</p><p><span className="font-medium">Recommendation JSON:</span> {JSON.stringify(data.recommendation_json ?? null)}</p></div>;
}
