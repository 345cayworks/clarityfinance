"use client";
import { useEffect, useMemo, useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";

type User = { id:string; name:string|null; email:string; role:string|null; approval_status:string|null; account_status:string|null; last_active_at:string|null; last_login_at:string|null; deactivated_at:string|null; created_at:string };
type AdvisorRequest = { id:string; name:string; email:string; phone:string; topic:string; urgency:string; status:string; created_at:string };

export default function Page(){
  const { user, accountStatus } = useWorkspaceUser();
  const [tab,setTab]=useState("pending"); const [users,setUsers]=useState<User[]>([]); const [advisorRequests,setAdvisor]=useState<AdvisorRequest[]>([]);
  const [invite,setInvite]=useState({name:"",email:"",role:"user"}); const [msg,setMsg]=useState("");
  const load=async()=>{const token=await getIdentityToken(user); if(!token)return; const r=await fetch('/.netlify/functions/admin-users-list',{headers:{Authorization:`Bearer ${token}`}}); const d=await r.json(); setUsers(d.users??[]); setAdvisor(d.advisorRequests??[]);};
  useEffect(()=>{load();},[user]);
  const act=async(path:string,payload:Record<string,unknown>)=>{const token=await getIdentityToken(user); if(!token)return; await fetch(`/.netlify/functions/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)}); await load();};
  const pending=useMemo(()=>users.filter(u=>u.approval_status==='pending'),[users]);
  const active=useMemo(()=>users.filter(u=>u.account_status==='active').sort((a,b)=>(b.last_active_at||"").localeCompare(a.last_active_at||"")),[users]);
  const deactivated=useMemo(()=>users.filter(u=>u.account_status==='deactivated'),[users]);
  if(accountStatus?.role!=="admin") return <div className="card">Admin access required.</div>;
  return <div className="card"><h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1><div className="flex gap-2 mb-4">{[["pending","Pending Approval"],["active","Active Users"],["deactivated","Deactivated Users"],["advisor","Advisor Requests"],["invite","Invite User"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className="px-3 py-1 border rounded">{l}</button>)}</div>
  {tab==='pending' && <table><tbody>{pending.map(u=><tr key={u.id}><td>{u.name||'-'}</td><td>{u.email}</td><td>{u.role||'user'}</td><td>{new Date(u.created_at).toLocaleString()}</td><td><button onClick={()=>act('admin-user-activate',{userId:u.id})}>Approve</button><button onClick={()=>act('admin-user-reject',{userId:u.id,reason:'Rejected'})}>Reject</button><button onClick={()=>act('admin-user-role-update',{userId:u.id,role:'advisor'})}>Make Advisor</button></td></tr>)}</tbody></table>}
  {tab==='active' && <table><tbody>{active.map(u=><tr key={u.id}><td>{u.name||'-'}</td><td>{u.email}</td><td>{u.role}</td><td>{u.approval_status}</td><td>{u.last_active_at?new Date(u.last_active_at).toLocaleString():'-'}</td><td>{u.last_login_at?new Date(u.last_login_at).toLocaleString():'-'}</td><td>{new Date(u.created_at).toLocaleString()}</td><td><button onClick={()=>act('admin-user-deactivate',{userId:u.id})}>Deactivate</button><button onClick={()=>act('admin-user-role-update',{userId:u.id,role:u.role==='advisor'?'user':'advisor'})}>Change Role</button></td></tr>)}</tbody></table>}
  {tab==='deactivated' && <table><tbody>{deactivated.map(u=><tr key={u.id}><td>{u.name||'-'}</td><td>{u.email}</td><td>{u.role}</td><td>{u.deactivated_at?new Date(u.deactivated_at).toLocaleString():'-'}</td><td><button onClick={()=>act('admin-user-activate',{userId:u.id})}>Reactivate</button></td></tr>)}</tbody></table>}
  {tab==='advisor' && <table><tbody>{advisorRequests.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.topic}</td><td>{r.urgency}</td><td>{r.status}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><button onClick={()=>act('admin-advisor-request-update',{id:r.id,status:'reviewing'})}>Mark Reviewing</button><button onClick={()=>act('admin-advisor-request-update',{id:r.id,status:'contacted'})}>Mark Contacted</button><button onClick={()=>act('admin-advisor-request-update',{id:r.id,status:'closed'})}>Mark Closed</button></td></tr>)}</tbody></table>}
  {tab==='invite' && <form onSubmit={async(e)=>{e.preventDefault();await act('admin-user-invite',invite);setMsg('User approved in app. Send invite through Netlify Identity or ask them to sign up with this email.');}}><input placeholder="Name" value={invite.name} onChange={e=>setInvite({...invite,name:e.target.value})}/><input placeholder="Email" value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})}/><select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value})}><option value="user">user</option><option value="advisor">advisor</option><option value="admin">admin</option></select><button type="submit">Invite</button><p>{msg}</p></form>}
  </div>;
}
