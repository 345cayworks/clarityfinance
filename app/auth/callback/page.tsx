"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { handleAuthCallback } from "@/lib/auth/netlify-identity";

type Status = "processing" | "error";

function forwardWithoutConsuming(hash: string): boolean {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment);
  return params.has("recovery_token") || params.has("invite_token");
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("processing");

  useEffect(() => {
    let cancelled = false;

    // recovery_token / invite_token need a set-password step that
    // /reset-password owns. Forward with the hash intact rather than
    // consuming the token here.
    if (typeof window !== "undefined" && forwardWithoutConsuming(window.location.hash)) {
      router.replace(`/reset-password${window.location.hash}` as Route);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const isEmailChange =
        typeof window !== "undefined" &&
        new URLSearchParams(
          window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
        ).has("email_change_token");
      try {
        await handleAuthCallback();
        if (cancelled) return;
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        router.replace(
          isEmailChange
            ? ("/app/settings?email_changed=1" as Route)
            : ("/login?confirmed=1" as Route)
        );
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
