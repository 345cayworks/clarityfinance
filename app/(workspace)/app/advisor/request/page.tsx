"use client";
import { useEffect, useState } from "react";
import { getIdentityToken, getUser } from "@/lib/auth/netlify-identity";

export default function AdvisorRequestPage(){
const [form,setForm]=useState<any>({name:"",email:"",phone:"",preferredContactMethod:"Email",topic:"Loan readiness",urgency:"medium",message:"",consentToReview:false,sourceContext:"advisor-request"});
const [saved,setSaved]=useState(false);
useEffect(()=>{(async()=>{const u=await getUser(); if(!u) return; setForm((f:any)=>({...f,name:u.userMetadata?.full_name||u.email,email:u.email,phone:u.userMetadata?.phone||""}));})();},[]);
const submit=async(e:any)=>{e.preventDefault(); const u=await getUser(); const token=await getIdentityToken(u); const r=await fetch('/.netlify/functions/advisor-request-save',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(form)}); setSaved(r.ok)};
return <div className="card max-w-3xl"><h1 className="text-2xl font-semibold text-[#0A2540]">Request Advisor Support</h1><form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">{['name','email','phone'].map((k)=><input key={k} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={k[0].toUpperCase()+k.slice(1)} className="rounded-lg border border-slate-300 px-3 py-2"/>) }
<select value={form.preferredContactMethod} onChange={e=>setForm({...form,preferredContactMethod:e.target.value})} className="rounded-lg border border-slate-300 px-3 py-2"><option>Email</option><option>Phone</option><option>WhatsApp</option></select>
<select value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} className="rounded-lg border border-slate-300 px-3 py-2"><option>Loan readiness</option><option>Mortgage planning</option><option>Cash-out refinance</option><option>Debt reduction</option><option>Savings plan</option><option>Full financial review</option></select>
<select value={form.urgency} onChange={e=>setForm({...form,urgency:e.target.value})} className="rounded-lg border border-slate-300 px-3 py-2"><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option></select>
<textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2" rows={5} placeholder="Message"/>
<label className="md:col-span-2 text-sm"><input type='checkbox' checked={form.consentToReview} onChange={e=>setForm({...form,consentToReview:e.target.checked})} className="mr-2"/>I agree to allow an advisor to review my financial profile and reports.</label>
<button className="md:col-span-2 rounded-lg bg-[#0A2540] px-4 py-2 text-white">Submit advisor request</button>{saved?<p className="md:col-span-2 text-emerald-700">Request submitted.</p>:null}
</form></div>
}
