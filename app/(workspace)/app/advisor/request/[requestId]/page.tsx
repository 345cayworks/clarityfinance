"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

type Recommendation = Record<string, unknown>;
const statusOptions = ["new", "reviewing", "contacted", "action_plan_sent", "closed"] as const;
const SOURCE_CONTEXT_LABELS: Record<string, string> = {"advisor-request": "Basic Advisor Request",loan_readiness: "Loan Readiness",prequalification: "Prequalification",report: "Financial Report",action_plan: "Action Plan"};
const toNumber = (value: unknown): number | null => { if (typeof value === "number") return Number.isFinite(value) ? value : null; if (typeof value === "string" && value.trim() !== "") { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; } return null; };

export default function AdvisorRequestDetailPage() {
  const { user } = useWorkspaceUser();
  const params = useParams<{ requestId: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("new");

  const run = async () => {
    const token = await getIdentityToken(user);
    if (!token || !params?.requestId) return;
    const r = await fetch(`/.netlify/functions/advisor-request-detail?requestId=${params.requestId}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Unable to load request"); return; }
    setData(d.request || null);
    setAdvisorNotes(String(d.request?.advisor_notes ?? ""));
    const nextStatus = String(d.request?.status ?? "new");
    setStatus(statusOptions.includes(nextStatus as (typeof statusOptions)[number]) ? nextStatus as (typeof statusOptions)[number] : "new");
  };

  useEffect(() => { void run(); }, [user, params?.requestId]);

  const save = async () => {
    const token = await getIdentityToken(user);
    if (!token || !params?.requestId) return;
    setIsSaving(true); setSaveError(""); setSaveSuccess("");
    const r = await fetch('/.netlify/functions/advisor-request-update',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({requestId:params.requestId,status,advisorNotes})});
    const d = await r.json();
    if (!r.ok) { setSaveError(d.error || "Update failed"); setIsSaving(false); return; }
    setData((prev) => ({ ...(prev ?? {}), ...(d.request ?? {}), status, advisor_notes: advisorNotes }));
    setSaveSuccess("Request updated successfully.");
    setIsSaving(false);
  };

  const recommendation = useMemo<Recommendation>(() => !data?.recommendation_json || typeof data.recommendation_json !== "object" ? {} : data.recommendation_json as Recommendation, [data]);
  const sourceContext = typeof data?.source_context === "string" ? data.source_context : "";
  const sourceContextLabel = SOURCE_CONTEXT_LABELS[sourceContext] ?? "Source not specified";
  const prequalificationUrl = typeof data?.prequalification_share_url === "string" ? data.prequalification_share_url : "";
  const hasRecommendation = Object.keys(recommendation).length > 0;

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Loading…</div>;

  const render = (label: string, key: string) => <p><span className="font-medium">{label}:</span> {String(data[key] ?? "-")}</p>;
  const metricLine = (label: string, value: unknown) => value === null || value === undefined || value === "" ? null : <li><span className="font-medium">{label}:</span> {String(value)}</li>;
  const dti = toNumber(recommendation.debtToIncome ?? recommendation.dti);
  const totalPressure = toNumber(recommendation.totalMonthlyPressure ?? recommendation.total_pressure ?? recommendation.totalObligationsRatio);
  const monthlySurplus = toNumber(recommendation.monthlySurplus ?? recommendation.monthly_surplus);

  return <div className="card space-y-3"><h1 className="text-xl font-semibold">Advisor Request Detail</h1>{saveSuccess && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{saveSuccess}</p>}{saveError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}{render("Client", "name")}{render("Email", "email")}{render("Phone", "phone")}{render("Topic", "topic")}{render("Urgency", "urgency")}{render("Status", "status")}{render("Assigned advisor email", "assigned_advisor_email")}{render("Assigned advisor id", "assigned_advisor_id")}{render("Assigned at", "assigned_at")}{render("Assigned by", "assigned_by")}{render("Created at", "created_at")}{render("Updated at", "updated_at")}<p><span className="font-medium">Message:</span> {String(data.message ?? "-")}</p>
    <div className="space-y-2 rounded border border-slate-200 p-3">
      <label className="block text-sm font-medium">Status</label>
      <select className="w-full rounded border p-2 text-sm" value={status} onChange={(e)=>setStatus(e.target.value as (typeof statusOptions)[number])}>{statusOptions.map((x)=><option key={x} value={x}>{x}</option>)}</select>
      <label className="block text-sm font-medium">Advisor notes</label>
      <textarea className="w-full rounded border p-2 text-sm" rows={5} value={advisorNotes} onChange={(e)=>setAdvisorNotes(e.target.value)} placeholder="Add advisor notes" />
      <button className="rounded border px-3 py-1 text-sm" disabled={isSaving} onClick={()=>void save()}>{isSaving ? "Saving..." : "Save Update"}</button>
    </div>
    <section className="rounded border border-slate-200 p-3 space-y-3"><h2 className="text-base font-semibold">Attached Artifacts</h2><div><h3 className="font-medium">Prequalification Summary</h3>{prequalificationUrl ? (<div className="space-y-1 text-sm"><a href={prequalificationUrl} target="_blank" rel="noreferrer" className="inline-block rounded bg-slate-900 px-3 py-2 text-white">Open Prequalification Summary</a><p><a href={prequalificationUrl} target="_blank" rel="noreferrer" className="underline break-all">{prequalificationUrl}</a></p></div>) : (<div className="text-sm text-slate-700"><p>No prequalification artifact is attached to this request yet.</p><p>Ask the client to complete the Loan Readiness or Prequalification step before review.</p></div>)}</div><div><h3 className="font-medium">Loan Readiness Report</h3><p className="text-sm">{String(data.loan_readiness_report_id ?? "-") !== "-" ? `Report ID: ${String(data.loan_readiness_report_id)}` : "No loan readiness report artifact is attached."}</p></div><div><h3 className="font-medium">Recommendation Summary</h3>{!hasRecommendation ? (<p className="text-sm">No structured recommendation was attached.</p>) : (<ul className="list-disc pl-5 text-sm space-y-1">{metricLine("Readiness score", recommendation.readinessScore ?? recommendation.score)}{metricLine("Readiness band", recommendation.readinessBand ?? recommendation.band)}{metricLine("Urgency", recommendation.urgency)}{metricLine("Recommendation package", recommendation.recommendationPackage ?? recommendation.package)}{metricLine("Key notes", recommendation.keyNotes ?? recommendation.notes)}{metricLine("Monthly surplus", monthlySurplus)}{metricLine("Total monthly household expenses", recommendation.householdExpensesTotal ?? recommendation.monthlyExpenses)}{metricLine("Debt-to-income", dti)}{metricLine("Total monthly pressure", totalPressure)}</ul>)}<details className="mt-2 text-xs"><summary className="cursor-pointer font-medium">Debug JSON</summary><pre className="mt-2 overflow-auto rounded bg-slate-100 p-2">{JSON.stringify(recommendation, null, 2)}</pre></details></div><div><h3 className="font-medium">Source Context</h3><p className="text-sm">{sourceContextLabel}</p></div></section></div>;
}
