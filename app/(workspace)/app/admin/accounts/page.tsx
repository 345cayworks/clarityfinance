"use client";
import { useEffect, useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

type UserRow = { id:string; name:string|null; email:string; phone:string|null; role:string|null; approval_status:string|null; created_at:string };
export default function AdminAccountsPage(){
  const { user, accountStatus } = useWorkspaceUser();
  const [rows,setRows]=useState<UserRow[]>([]);
  const [loading,setLoading]=useState(true);
  const load=async()=>{ const token=await getIdentityToken(user); if(!token) return; const r=await fetch('/.netlify/functions/admin-users-list',{headers:{Authorization:`Bearer ${token}`}}); const d=await r.json(); setRows(d.users??[]); setLoading(false);};
  useEffect(()=>{load();},[user]);
  const act=async(path:string,payload:Record<string,unknown>)=>{const token=await getIdentityToken(user); if(!token) return; await fetch(`/.netlify/functions/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)}); await load();};
  if(accountStatus?.role!=='admin') return <div className="card">Admin access required.</div>;
  if(loading) return <div className="card">Loading…</div>;
  return <div className="card overflow-auto"><h1 className="text-2xl font-semibold text-[#0A2540] mb-4">Admin Accounts</h1><table className="min-w-full text-sm"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td>{r.name||'-'}</td><td>{r.email}</td><td>{r.phone||'-'}</td><td>{r.role||'user'}</td><td>{r.approval_status||'pending'}</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td className="space-x-2"><button onClick={()=>act('admin-user-approve',{userId:r.id})}>Approve</button><button onClick={()=>act('admin-user-reject',{userId:r.id,reason:'Rejected by admin'})}>Reject</button><button onClick={()=>act('admin-user-role-update',{userId:r.id,role:'advisor'})}>Make Advisor</button><button onClick={()=>act('admin-user-role-update',{userId:r.id,role:'admin'})}>Make Admin</button><button onClick={()=>act('admin-user-reject',{userId:r.id,reason:''})}>Reset to Pending</button></td></tr>)}</tbody></table></div>;
}
