"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { describeAuthError, getIdentityToken, getUser } from "@/lib/auth/netlify-identity";
import PersonalCard from "@/components/onboarding/PersonalCard";
import ContactCard from "@/components/onboarding/ContactCard";
import IncomeCard from "@/components/onboarding/IncomeCard";
import ExpensesCard from "@/components/onboarding/ExpensesCard";
import HousingCard from "@/components/onboarding/HousingCard";
import DebtCard from "@/components/onboarding/DebtCard";
import SavingsCard from "@/components/onboarding/SavingsCard";
import GoalsCard from "@/components/onboarding/GoalsCard";

const sections = [
  { key: "personal", name: "Personal Information", description: "Basic identity details", fields: [{ name: "customerName", label: "Customer name" }, { name: "dateOfBirth", label: "Date of birth" }, { name: "dependents", label: "Dependents", type: "number" }] },
  { key: "contact", name: "Contact Information", description: "How to reach you", fields: [{ name: "phone", label: "Phone" }, { name: "alternatePhone", label: "Alternate phone" }, { name: "physicalAddress", label: "Physical address" }, { name: "mailingAddress", label: "Mailing address" }] },
  { key: "income", name: "Employment & Income", description: "Work and earnings", fields: [{ name: "employmentType", label: "Employment type" }, { name: "employer", label: "Employer" }, { name: "jobTitle", label: "Job title" }, { name: "monthlyGrossIncome", label: "Monthly gross income", type: "number" }, { name: "monthlyNetIncome", label: "Monthly net income", type: "number" }] },
  { key: "expenses", name: "Expenses", description: "Monthly spending", fields: [{ name: "expenseHousing", label: "Housing", type: "number" }, { name: "expenseUtilities", label: "Utilities", type: "number" }, { name: "expenseTransport", label: "Transport", type: "number" }] },
  { key: "housing", name: "Housing & Property", description: "Housing profile", fields: [{ name: "housingStatus", label: "Housing status" }, { name: "rentAmount", label: "Rent amount", type: "number" }, { name: "mortgageBalance", label: "Mortgage balance", type: "number" }, { name: "propertyType", label: "Property type" }, { name: "propertyLocation", label: "Property location" }] },
  { key: "debt", name: "Debts & Liabilities", description: "Debt snapshot", fields: [{ name: "debtName", label: "Debt name" }, { name: "debtType", label: "Debt type" }, { name: "debtBalance", label: "Debt balance", type: "number" }, { name: "debtMonthlyPayment", label: "Debt monthly payment", type: "number" }] },
  { key: "savings", name: "Savings & Assets", description: "Savings profile", fields: [{ name: "cashSavings", label: "Cash savings", type: "number" }, { name: "investments", label: "Investments", type: "number" }, { name: "retirementSavings", label: "Retirement savings", type: "number" }] },
  { key: "goals", name: "Goals & Loan Details", description: "Targets and loan details", fields: [{ name: "targetGoal", label: "Target goal" }, { name: "loanPurpose", label: "Loan purpose" }, { name: "requestedLoanAmount", label: "Requested loan amount", type: "number" }, { name: "desiredLoanTermYears", label: "Desired loan term years", type: "number" }] }
] as const;

const cards: Record<string, any> = { personal: PersonalCard, contact: ContactCard, income: IncomeCard, expenses: ExpensesCard, housing: HousingCard, debt: DebtCard, savings: SavingsCard, goals: GoalsCard };

export default function OnboardingPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("personal");
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});

  useEffect(() => { (async()=>{ const user=await getUser(); if(!user) return; const token=await getIdentityToken(user); if(!token) return; const r=await fetch('/.netlify/functions/profile-get',{headers:{Authorization:`Bearer ${token}`}}); if(!r.ok) return; const d=await r.json(); const p=d.profile||{}; setFormData({ customerName:String(p.customer_name??""), dateOfBirth:String(p.date_of_birth??""), dependents:String(p.dependents??""), phone:String(p.phone??""), alternatePhone:String(p.alternate_phone??""), physicalAddress:String(p.physical_address??""), mailingAddress:String(p.mailing_address??""), employmentType:String(p.employment_type??""), employer:String(p.employer??""), jobTitle:String(p.job_title??""), monthlyGrossIncome:String(p.monthly_gross_income??""), monthlyNetIncome:String(p.monthly_net_income??""), expenseHousing:String(d.expenseProfile?.housing??""), expenseUtilities:String(d.expenseProfile?.utilities??""), expenseTransport:String(d.expenseProfile?.transport??""), housingStatus:String(d.housingProfile?.housing_status??""), rentAmount:String(d.housingProfile?.rent_amount??""), mortgageBalance:String(d.housingProfile?.mortgage_balance??""), propertyType:String(p.property_type??""), propertyLocation:String(p.property_location??""), debtName:String(d.debts?.[0]?.name??""), debtType:String(d.debts?.[0]?.type??""), debtBalance:String(d.debts?.[0]?.balance??""), debtMonthlyPayment:String(d.debts?.[0]?.monthly_payment??""), cashSavings:String(d.savingsProfile?.cash_savings??""), investments:String(d.savingsProfile?.investments??""), retirementSavings:String(d.savingsProfile?.retirement_savings??""), targetGoal:String(d.goals?.target_goal??""), loanPurpose:String(p.loan_purpose??""), requestedLoanAmount:String(p.requested_loan_amount??""), desiredLoanTermYears:String(p.desired_loan_term_years??"") }); })(); },[]);

  const activeIndex = sections.findIndex((s)=>s.key===activeSection);
  const completion = useMemo(()=>{ const completed=sections.filter((s)=> s.fields.every((f)=>String(formData[f.name] ?? "").trim()!=="")).length; return { completed, pct: Math.round((completed/sections.length)*100)}; },[formData]);
  const status = (s:(typeof sections)[number]) => { const filled=s.fields.filter((f)=>String(formData[f.name]??"").trim()!=="").length; if (filled===0) return "Not started"; if (filled===s.fields.length) return "Complete"; return "In progress"; };

  const validateSection = (key:string) => { const s=sections.find((x)=>x.key===key)!; const req=s.fields.slice(0,2); const missing=req.filter((f)=>String(formData[f.name]??"").trim()===""); setSectionErrors((p)=>({...p,[key]: missing.length?`Please complete: ${missing.map((m)=>m.label).join(", ")}`:""})); return missing.length===0; };

  const save = async (onlyCurrent=true) => { setSaving(true); setError(""); setMessage(""); if (onlyCurrent && !validateSection(activeSection)) { setSaving(false); return; } try { const user=await getUser(); if(!user){router.replace('/login?callbackUrl=%2Fapp%2Fonboarding' as Route); return;} const token=await getIdentityToken(user); if(!token){setError('Session verification failed.'); return;} const payload={...formData}; const r=await fetch('/.netlify/functions/profile-save',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)}); const result=await r.json().catch(()=>({})); if(!r.ok){setError(result.error||'Save failed'); return;} setMessage('Saved successfully.'); } catch(err){setError(describeAuthError(err));} finally {setSaving(false);} };

  const ActiveCard = cards[activeSection];
  return <div className="space-y-4"><div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-sm font-medium">Profile Completion: {completion.pct}%</p><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-blue-600" style={{width:`${completion.pct}%`}} /></div><div className="mt-3"><button className="rounded bg-[#0A2540] px-3 py-2 text-white" onClick={()=>save(false)} disabled={saving}>{saving?'Saving...':'Save All'}</button></div></div><div className="grid gap-4 md:grid-cols-[280px,1fr]"><aside className="rounded-xl border bg-white p-3 shadow-sm"><h2 className="mb-2 font-semibold">Build Your Profile</h2><div className="flex gap-2 overflow-x-auto md:block md:space-y-2">{sections.map((s)=><button key={s.key} onClick={()=>setActiveSection(s.key)} className={`w-full rounded border px-3 py-2 text-left text-sm ${activeSection===s.key?'bg-blue-50 border-blue-300':'bg-white'}`}><div className="font-medium">{s.name}</div><div className="text-xs text-slate-500">{status(s)}</div></button>)}</div></aside><section><ActiveCard title={sections[activeIndex].name} description={sections[activeIndex].description} fields={sections[activeIndex].fields} formData={formData} setFormData={setFormData} error={sectionErrors[activeSection]} /><div className="mt-3 flex flex-wrap gap-2"><button className="rounded border px-3 py-2" disabled={activeIndex===0} onClick={()=>setActiveSection(sections[Math.max(0,activeIndex-1)].key)}>Previous Section</button><button className="rounded border px-3 py-2" disabled={activeIndex===sections.length-1} onClick={()=>setActiveSection(sections[Math.min(sections.length-1,activeIndex+1)].key)}>Next Section</button><button className="rounded bg-[#0A2540] px-3 py-2 text-white" onClick={()=>save(true)} disabled={saving}>{saving?'Saving...':'Save Section'}</button></div></section></div>{message?<p className="text-green-700 text-sm">{message}</p>:null}{error?<p className="text-red-700 text-sm">{error}</p>:null}</div>;
}
