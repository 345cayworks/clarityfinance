"use client";
import { useEffect, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
export default function AdvisorStatusPage(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{(async()=>{const u=await getUser();const t=await getIdentityToken(u);const r=await fetch('/.netlify/functions/advisor-requests-my',{headers:{Authorization:`Bearer ${t}`}});if(r.ok){const d=await r.json();setRows(d.requests||[])}})()},[]);return <div className='card'><h1 className='text-2xl font-semibold text-[#0A2540]'>My Advisor Requests</h1><div className='mt-4 space-y-2'>{rows.map((r)=><div key={r.id} className='rounded-lg border p-3 text-sm'>{r.topic} · {r.status} · {new Date(r.created_at).toLocaleDateString()}</div>)}</div></div>}
