"use client";
import {useEffect,useState} from "react";
import Script from "next/script";
import {getIdentityToken,getUser} from "@/lib/auth/netlify-identity";

export default function AdvisorStatusPage(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{(async()=>{const u=await getUser();const t=await getIdentityToken(u);const r=await fetch('/.netlify/functions/advisor-requests-my',{headers:{Authorization:`Bearer ${t}`}});if(r.ok){const d=await r.json();setRows(d.requests||[])}})()},[]);return <div className='card'><h1 className='text-2xl font-semibold text-[#0A2540]'>My Advisor Requests</h1><div className='mt-4 space-y-2'>{rows.map((r)=><div key={r.id} className='rounded-lg border p-3 text-sm'>{r.topic} · {r.status} · {new Date(r.created_at).toLocaleDateString()}</div>)}</div><section className='mt-6 rounded-lg border p-4'><h2 className='text-lg font-semibold text-[#0A2540]'>Advisor Session Payment</h2><p className='mt-2 text-sm text-slate-600'>Advisor session payment is processed securely through Fygaro.</p><Script src="https://api.fygaro.com/api/v1/payments/payment-button/dc86510d-39bc-4910-b8a8-b8f829967219/render/" strategy="afterInteractive" /></section></div>}
