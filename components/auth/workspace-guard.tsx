"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    const currentPath = `${pathname}${search ? `?${search}` : ""}`;

    setChecking(true);
    setAuthenticated(false);

    fetch("/.netlify/functions/me", { credentials: "include" })
      .then(async (response) => {
        if (!active) return;

        if (response.ok) {
          setAuthenticated(true);
          setChecking(false);
          return;
        }

        setAuthenticated(false);
        setChecking(false);
        router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      })
      .catch(() => {
        if (!active) return;

        setAuthenticated(false);
        setChecking(false);
        router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      });

    return () => {
      active = false;
    };
  }, [pathname, router, search]);

  if (checking) {
    return <p className="p-6 text-sm text-slate-600">Checking your session...</p>;
  }

  if (!authenticated) return null;

  return <>{children}</>;
}
