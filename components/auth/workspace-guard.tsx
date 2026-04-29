"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, createContext, useContext, useEffect, useState } from "react";
import { getUser, onAuthChange, type IdentityUser, getIdentityToken } from "@/lib/auth/netlify-identity";

type AccountStatus = { approved: boolean; active: boolean; approvalStatus: "pending" | "approved" | "rejected"; accountStatus: "active" | "inactive" | "deactivated"; role: string; lastActiveAt: string | null };
const WorkspaceContext = createContext<{ user: IdentityUser | null; accountStatus: AccountStatus | null; refresh: () => Promise<void>; }>({ user: null, accountStatus: null, refresh: async () => undefined });
export const useWorkspaceUser = () => useContext(WorkspaceContext);

function WorkspaceLoader(){return <div className="grid min-h-screen place-items-center">Loading…</div>;}
export function WorkspaceGuard({ children }: { children: React.ReactNode }) {return <Suspense fallback={<WorkspaceLoader />}><Inner>{children}</Inner></Suspense>;}
function Inner({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true); const [user, setUser] = useState<IdentityUser | null>(null); const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  useEffect(() => { let mounted = true; const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const refresh = async () => { const current = await getUser(); if (!mounted) return; setUser(current); if (!current) { router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`); return; }
      const token = await getIdentityToken(current); if (!token) return;
      const res = await fetch("/.netlify/functions/account-status", { credentials: "same-origin", headers: { Authorization: `Bearer ${token}` } });
      const status = res.ok ? await res.json() as AccountStatus : null; setAccountStatus(status);
      if (status && (!status.approved || !status.active) && pathname !== "/app/pending-approval") { router.replace(`/app/pending-approval?approval=${status.approvalStatus}&account=${status.accountStatus}`); return; }
      if (status?.approved && status?.active && pathname === "/app/pending-approval") { router.replace('/app/dashboard'); return; }
      const lastPing = Number(localStorage.getItem("activity_ping_at") ?? "0");
      if (Date.now() - lastPing > 5 * 60 * 1000) { await fetch("/.netlify/functions/activity-ping", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); localStorage.setItem("activity_ping_at", String(Date.now())); }
      setChecking(false);
    };
    refresh(); const unsub = onAuthChange((_e,u)=>{if(!mounted) return; if(!u){router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);return;} setUser(u);});
    return ()=>{mounted=false;unsub();};
  }, [pathname, router, searchParams]);
  if (checking) return <WorkspaceLoader />;
  return <WorkspaceContext.Provider value={{ user, accountStatus, refresh: async () => setUser(await getUser()) }}>{children}</WorkspaceContext.Provider>;
}
