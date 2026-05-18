"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { handleAuthCallback } from "@/lib/auth/netlify-identity";

type Status = "processing" | "error";

function destinationForResult(type: string | undefined): Route {
  switch (type) {
    case "recovery":
      return "/reset-password" as Route;
    case "invite":
      return "/reset-password?invited=1" as Route;
    case "email_change":
      return "/app/settings?email_changed=1" as Route;
    case "confirmation":
    default:
      return "/login?confirmed=1" as Route;
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("processing");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await handleAuthCallback();
        if (cancelled) return;
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        router.replace(destinationForResult(result?.type));
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      {status === "processing" ? (
        <div className="space-y-2">
          <p className="text-base font-semibold text-[#0A2540]">Confirming your account…</p>
          <p className="text-sm text-slate-600">One moment while we verify your link.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-base font-semibold text-[#0A2540]">This link is invalid or has expired.</p>
          <p className="text-sm text-slate-600">
            Please request a new link or try signing in.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
