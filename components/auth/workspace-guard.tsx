"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getUser, onAuthChange, type IdentityUser, getIdentityToken } from "@/lib/auth/netlify-identity";

type AccountStatus = { approved: boolean; active: boolean; approvalStatus: "pending" | "approved" | "rejected"; accountStatus: "active" | "inactive" | "deactivated"; role: string; lastActiveAt: string | null };
const WorkspaceContext = createContext<{ user: IdentityUser | null; accountStatus: AccountStatus | null; refresh: () => Promise<void>; }>({ user: null, accountStatus: null, refresh: async () => undefined });
export const useWorkspaceUser = () => useContext(WorkspaceContext);

function WorkspaceLoader(){return <div className="grid min-h-screen place-items-center">Loading…</div>;}
export function WorkspaceGuard({ children }: { children: React.ReactNode }) {return <Suspense fallback={<WorkspaceLoader />}><Inner>{children}</Inner></Suspense>;}

function canAccess(pathname: string, status: AccountStatus) {
  const role = status.role;
  const isAdmin = ["admin", "superadmin"].includes(role);
  const isAdvisor = ["advisor", "admin", "superadmin"].includes(role);
  const isPremium = ["premium_user", "admin", "superadmin"].includes(role);
  if (!status.approved || !status.active) return pathname === "/app/pending-approval" || pathname === "/app/profile" || pathname === "/app/onboarding";
  if (pathname.startsWith('/app/admin')) return isAdmin;
  if (pathname.startsWith('/app/advisor/dashboard')) return isAdvisor;
  if (pathname.startsWith('/app/loan-readiness') || pathname.startsWith('/app/loan-application') || pathname.startsWith('/app/prequalification/')) return isPremium;
  return true;
}

function Inner({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true); const [user, setUser] = useState<IdentityUser | null>(null); const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const mountedRef = useRef(false);
  const searchString = searchParams.toString();
  const currentPath = useMemo(() => `${pathname}${searchString ? `?${searchString}` : ""}`, [pathname, searchString]);
  const loginRedirect = useMemo(() => `/login?callbackUrl=${encodeURIComponent(currentPath)}`, [currentPath]);
  const refreshContext = useCallback(async () => {
    const current = await getUser();
    if (!mountedRef.current) return;
    setUser(current);
    if (!current) {
      setAccountStatus(null);
      return;
    }
    const token = await getIdentityToken(current);
    if (!mountedRef.current) return;
    if (!token) {
      setAccountStatus(null);
      return;
    }
    const res = await fetch("/.netlify/functions/account-status", { credentials: "same-origin", headers: { Authorization: `Bearer ${token}` } });
    if (!mountedRef.current) return;
    if (!res.ok) {
      setAccountStatus(null);
      return;
    }
    const status = await res.json() as AccountStatus;
    if (!mountedRef.current) return;
    setAccountStatus(status);
  }, []);

  useEffect(() => { let mounted = true; let redirected = false; mountedRef.current = true;
    const safeRedirect = (href: string) => {
      if (!mounted || redirected) return;
      redirected = true;
      setChecking(false);
      router.replace(href as Parameters<typeof router.replace>[0]);
    };
    const refresh = async () => {
      try {
        const current = await getUser(); if (!mounted) return; setUser(current);
        if (!current) { setAccountStatus(null); safeRedirect(loginRedirect); return; }
        const token = await getIdentityToken(current); if (!mounted) return;
        if (!token) { setAccountStatus(null); safeRedirect(loginRedirect); return; }
        const res = await fetch("/.netlify/functions/account-status", { credentials: "same-origin", headers: { Authorization: `Bearer ${token}` } });
        if (!mounted) return;
        if (!res.ok) {
          setAccountStatus(null);
          if (res.status === 401 || res.status === 403) { safeRedirect(loginRedirect); return; }
          setChecking(false);
          return;
        }
        const status = await res.json() as AccountStatus; if (!mounted) return; setAccountStatus(status);
        if ((!status.approved || !status.active) && pathname !== "/app/pending-approval" && pathname !== "/app/profile" && pathname !== "/app/onboarding") { safeRedirect(`/app/pending-approval?approval=${status.approvalStatus}&account=${status.accountStatus}`); return; }
        if (!canAccess(pathname, status)) { safeRedirect('/app/dashboard'); return; }
        const lastPing = Number(localStorage.getItem("activity_ping_at") ?? "0");
        if (Date.now() - lastPing > 5 * 60 * 1000) { await fetch("/.netlify/functions/activity-ping", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); if (!mounted) return; localStorage.setItem("activity_ping_at", String(Date.now())); }
        if (mounted) setChecking(false);
      } catch {
        if (mounted) {
          setAccountStatus(null);
          setChecking(false);
        }
      }
    };
    refresh(); const unsub = onAuthChange((_e,u)=>{if(!mounted) return; if(!u){setUser(null); setAccountStatus(null); safeRedirect(loginRedirect);return;} setUser(u);});
    return ()=>{mounted=false; mountedRef.current=false; unsub();};
  }, [pathname, router, loginRedirect]);
  if (checking) return <WorkspaceLoader />;
  return <WorkspaceContext.Provider value={{ user, accountStatus, refresh: refreshContext }}>{children}</WorkspaceContext.Provider>;
}
