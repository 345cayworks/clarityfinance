"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";

export default function AdvisorRequestPage(){
const [form,setForm]=useState<any>({name:"",email:"",phone:"",preferredContactMethod:"Email",topic:"Loan readiness",urgency:"medium",message:"",consentToReview:false,sourceContext:"advisor-request"});
const [saved,setSaved]=useState(false);
useEffect(()=>{(async()=>{const u=await getUser(); if(!u) return; setForm((f:any)=>({...f,name:u.userMetadata?.full_name||u.email,email:u.email,phone:u.userMetadata?.phone||""}));})();},[]);
const submit=async(e:any)=>{e.preventDefault(); if(!form.consentToReview) return; const u=await getUser(); const token=await getIdentityToken(u); const r=await fetch('/.netlify/functions/advisor-request-save',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...form,consentMetadata:{recipientType:"advisor",recipientName:"Assigned advisor",sourceContext:"advisor-request",consentVersion:"data-sharing-consent-v1",sharedScope:{financialProfile:true,reports:true,advisorMessage:true}}})}); setSaved(r.ok)};
return <div className="card max-w-3xl space-y-4"><h1 className="text-2xl font-semibold text-[#0A2540]">Request Advisor Support</h1><DecisionBoundaryNotice context="advisor" /><form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">{['name','email','phone'].map((k)=><input key={k} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={k[0].toUpperCase()+k.slice(1)} className="rounded-lg border border-slate-300 px-3 py-2"/>) }
<select value={form.preferredContactMethod} onChange={e=>setForm({...form,preferredContactMethod:e.target.value})} className="rounded-lg border border-slate-300 px-3 py-2"><option>Email</option><option>Phone</option><option>WhatsApp</option></select>
<select value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} className="rounded-lg border border-slate-300 px-3 py-2"><option>Loan readiness</option><option>Mortgage planning</option><option>Cash-out refinance</option><option>Debt reduction</option><option>Savings plan</option><option>Full financial review</option></select>
<select value={form.urgency} onChange={e=>setForm({...form,urgency:e.target.value})} className="rounded-lg border border-slate-300 px-3 py-2"><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option></select>
<textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2" rows={5} placeholder="Message"/>
<label className="md:col-span-2 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><input type='checkbox' checked={form.consentToReview} onChange={e=>setForm({...form,consentToReview:e.target.checked})} className="mt-1"/> <span>I authorize Clarity Finance to share the selected readiness summary, financial snapshot, and supporting information with the assigned advisor or selected financial institution for review. I understand this is not a loan approval or investment recommendation.</span></label>
<button disabled={!form.consentToReview} className="md:col-span-2 rounded-lg bg-[#0A2540] px-4 py-2 text-white disabled:opacity-60">Submit advisor request</button>{saved?<div className="md:col-span-2"><p className="text-emerald-700">Request submitted.</p><p className="mt-2 text-sm text-slate-600">Advisor session payment is processed securely through Fygaro.</p><Script src="https://api.fygaro.com/api/v1/payments/payment-button/dc86510d-39bc-4910-b8a8-b8f829967219/render/" strategy="afterInteractive" /></div>:null}
</form></div>
}
