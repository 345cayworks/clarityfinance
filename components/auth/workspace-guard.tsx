"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, initIdentity, onIdentityEvent } from "@/lib/auth/netlify-identity";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const checkAuth = async () => {
      setChecking(true);
      await initIdentity();

      const user = getCurrentUser();
      if (!mounted) return;

      if (user) {
        setChecking(false);
        return;
      }

      router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
    };

    let cleanup = () => undefined;

    checkAuth();

    onIdentityEvent("login", () => {
      if (mounted) {
        setChecking(false);
      }
    }).then((offLogin) => {
      cleanup = offLogin;
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, [pathname, router, searchParams]);

  if (checking) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return <>{children}</>;
}
