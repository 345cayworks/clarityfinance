"use client";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth/netlify-identity";
export default function PendingApprovalPage() {
  const router = useRouter();
  return <div className="card max-w-2xl"><h1 className="text-2xl font-semibold text-[#0A2540]">Your account is pending approval.</h1><p className="mt-2 text-sm text-slate-600">An administrator will review your account before full access is enabled.</p><button className="mt-6 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={async()=>{await logout();router.replace('/login');}}>Log out</button></div>;
}
