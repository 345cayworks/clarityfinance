"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/.netlify/functions/me", { credentials: "include" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
