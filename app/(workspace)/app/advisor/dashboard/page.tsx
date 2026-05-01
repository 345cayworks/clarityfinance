"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

type Row = { id:string;name:string;email:string;phone:string;topic:string;urgency:string;status:string;message:string;created_at:string;updated_at?:string;assigned_at?:string;advisor_notes?:string;assigned_advisor_email?:string };
const tabs = ["open","reviewing","contacted","closed","all"] as const;

export default function AdvisorDashboardPage(){
  const { user, accountStatus } = useWorkspaceUser();
  const [rows,setRows]=useState<Row[]>([]);
  const [tab,setTab]=useState<(typeof tabs)[number]>("open");
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [toast, setToast] = useState("");

  const load = async () => { const t=await getIdentityToken(user); if(!t) return; const r=await fetch('/.netlify/functions/advisor-requests-assigned',{headers:{Authorization:`Bearer ${t}`}}); if(r.ok){const d=await r.json(); setRows(d.requests||[]); setDrafts(Object.fromEntries((d.requests||[]).map((x:Row)=>[x.id, x.advisor_notes || ""])));} };
  useEffect(()=>{void load();},[user]);
  const filtered = useMemo(()=>rows.filter((r)=> tab==="all" ? true : tab==="open" ? r.status!=="closed" : r.status===tab),[rows,tab]);

  const update = async (requestId:string,status:string,overrideNotes?:string)=>{const t=await getIdentityToken(user); if(!t) return false; const advisorNotes=overrideNotes ?? drafts[requestId] ?? ""; const r=await fetch('/.netlify/functions/advisor-request-update',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({requestId,status,advisorNotes})}); if(r.ok){setRows((prev)=>prev.map((x)=>x.id===requestId?{...x,status,advisor_notes:advisorNotes,updated_at:new Date().toISOString()}:x)); setToast(`Updated ${status}`); return true;} return false;};

  if (!["advisor","admin","superadmin"].includes(accountStatus?.role || "")) return <div className="card">Advisor, admin, or superadmin access required.</div>;
  const emptyMessage = tab==="open"?"No open assigned reviews":tab==="reviewing"?"No reviewing cases":tab==="contacted"?"No contacted cases":tab==="closed"?"No closed cases":"No assigned reviews yet";

  return <div className="card space-y-4"><h1 className="text-2xl font-semibold text-[#0A2540]">Advisor Dashboard</h1>{toast && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}<div className="flex flex-wrap gap-2">{tabs.map((t)=><button key={t} className={`rounded border px-3 py-1 ${tab===t?'bg-slate-100':''}`} onClick={()=>setTab(t)}>{t==="all"?"All Assigned":t[0].toUpperCase()+t.slice(1)}</button>)}</div><div className="space-y-3">{filtered.length===0 && <div className="rounded border border-dashed p-4 text-sm text-slate-500">{emptyMessage}</div>}{filtered.map((r)=><div key={r.id} className="rounded border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{r.name} • {r.topic}</p><span className="text-xs text-slate-500">{r.status}</span></div><p className="text-sm text-slate-600">{r.email} • {r.phone} • {r.urgency}</p><p className="text-xs text-slate-500">Created: {new Date(r.created_at).toLocaleString()} • Assigned: {r.assigned_at ? new Date(r.assigned_at).toLocaleString() : '-'} • Updated: {r.updated_at ? new Date(r.updated_at).toLocaleString() : '-'}</p><p className="mt-1 text-sm">{(r.message || "").slice(0, 220)}</p><p className="mt-1 text-xs text-slate-500">Notes: {(drafts[r.id] || "none").slice(0,120)}</p><textarea className="mt-2 w-full rounded border p-2 text-sm" value={drafts[r.id] || ''} placeholder="Advisor notes" onChange={(e)=>setDrafts((prev)=>({...prev,[r.id]:e.target.value}))} /><div className="mt-2 flex flex-wrap gap-2"><Link className="rounded border px-2 py-1 text-sm" href={`/app/advisor/request/${r.id}`}>View Details</Link><button className="rounded border px-2 py-1 text-sm" onClick={()=>void update(r.id,r.status)}>Save Notes</button><button className="rounded border px-2 py-1 text-sm" onClick={()=>void update(r.id,'reviewing')}>Mark Reviewing</button><button className="rounded border px-2 py-1 text-sm" onClick={()=>void update(r.id,'contacted')}>Mark Contacted</button><button className="rounded border px-2 py-1 text-sm" onClick={()=>void update(r.id,'closed')}>Close Request</button></div></div>)}</div></div>;
}
