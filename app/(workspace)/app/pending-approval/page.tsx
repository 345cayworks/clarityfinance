"use client";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth/netlify-identity";

export default function PendingApprovalPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const approval = sp.get("approval");
  const account = sp.get("account");
  const message = account === "deactivated" ? "Your account has been deactivated. Please contact an administrator." : approval === "rejected" ? "Your account was rejected. Please contact support." : "Your account is pending approval.";

  return <div className="card max-w-2xl"><h1 className="text-2xl font-semibold text-[#0A2540]">Account access limited</h1><p className="mt-2 text-sm text-slate-600">{message}</p><button className="mt-6 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onClick={async()=>{await logout();router.replace('/login');}}>Log out</button></div>;
}
