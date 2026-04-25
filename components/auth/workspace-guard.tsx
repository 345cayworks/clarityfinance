"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, createContext, useContext, useEffect, useState } from "react";
import { getUser, onAuthChange, type IdentityUser } from "@/lib/auth/netlify-identity";

type WorkspaceContextValue = {
  user: IdentityUser | null;
  refresh: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue>({
  user: null,
  refresh: async () => undefined
});

export function useWorkspaceUser() {
  return useContext(WorkspaceContext);
}

function WorkspaceLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        Loading your workspace…
      </div>
    </div>
  );
}

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<WorkspaceLoader />}>
      <WorkspaceGuardInner>{children}</WorkspaceGuardInner>
    </Suspense>
  );
}

function WorkspaceGuardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<IdentityUser | null>(null);

  useEffect(() => {
    let mounted = true;
    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const refresh = async () => {
      const current = await getUser();
      if (!mounted) return;
      setUser(current);
      if (!current) {
        router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
        return;
      }
      setChecking(false);
    };

    refresh();

    const unsubscribe = onAuthChange((event, nextUser) => {
      if (!mounted) return;
      if (event === "logout" || !nextUser) {
        setUser(null);
        router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
        return;
      }
      setUser(nextUser);
      setChecking(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [pathname, router, searchParams]);

  if (checking) {
    return <WorkspaceLoader />;
  }

  return (
    <WorkspaceContext.Provider value={{ user, refresh: async () => setUser(await getUser()) }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
