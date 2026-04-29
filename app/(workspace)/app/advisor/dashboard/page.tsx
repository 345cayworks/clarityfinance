"use client";

import { useEffect, useMemo, useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

type Row = { id:string;name:string;email:string;phone:string;topic:string;urgency:string;status:string;message:string;created_at:string;assigned_at?:string;advisor_notes?:string };
const tabs = ["assigned","reviewing","contacted","closed"] as const;

export default function AdvisorDashboardPage(){
  const { user, accountStatus } = useWorkspaceUser();
  const [rows,setRows]=useState<Row[]>([]);
  const [tab,setTab]=useState<(typeof tabs)[number]>("assigned");

  const load = async () => { const t=await getIdentityToken(user); if(!t) return; const r=await fetch('/.netlify/functions/advisor-requests-assigned',{headers:{Authorization:`Bearer ${t}`}}); if(r.ok){const d=await r.json(); setRows(d.requests||[]);} };
  useEffect(()=>{void load();},[user]);
  const filtered = useMemo(()=>rows.filter((r)=> tab==="assigned" ? true : r.status===tab),[rows,tab]);
  const update = async (requestId:string,status:string,advisorNotes?:string)=>{const t=await getIdentityToken(user); if(!t) return; const r=await fetch('/.netlify/functions/advisor-request-update',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({requestId,status,advisorNotes})}); if(r.ok){setRows((prev)=>prev.map((x)=>x.id===requestId?{...x,status,advisor_notes:advisorNotes}:x));}};

  if (!["advisor","admin"].includes(accountStatus?.role || "")) return <div className="card">Advisor or admin access required.</div>;
  return <div className="card space-y-4"><h1 className="text-2xl font-semibold text-[#0A2540]">Advisor Dashboard</h1><div className="flex gap-2">{tabs.map((t)=><button key={t} className={`rounded border px-3 py-1 ${tab===t?'bg-slate-100':''}`} onClick={()=>setTab(t)}>{t==="assigned"?"Assigned to Me":t[0].toUpperCase()+t.slice(1)}</button>)}</div><div className="space-y-3">{filtered.map((r)=><div key={r.id} className="rounded border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{r.name} • {r.topic}</p><span className="text-xs text-slate-500">{r.status}</span></div><p className="text-sm text-slate-600">{r.email} • {r.phone} • {r.urgency}</p><p className="text-xs text-slate-500">Created: {new Date(r.created_at).toLocaleString()} • Assigned: {r.assigned_at ? new Date(r.assigned_at).toLocaleString() : '-'}</p><p className="mt-1 text-sm">{r.message}</p><textarea className="mt-2 w-full rounded border p-2 text-sm" defaultValue={r.advisor_notes || ''} placeholder="Advisor notes" onBlur={(e)=>update(r.id,r.status,e.target.value)} /><div className="mt-2 flex gap-2"><button className="rounded border px-2 py-1 text-sm">View Details</button><button className="rounded border px-2 py-1 text-sm" onClick={()=>update(r.id,'contacted',r.advisor_notes)}>Mark Contacted</button><button className="rounded border px-2 py-1 text-sm" onClick={()=>update(r.id,'closed',r.advisor_notes)}>Close Request</button></div></div>)}</div></div>;
}
