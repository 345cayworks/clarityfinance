"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { handleAuthCallback } from "@/lib/auth/netlify-identity";

const TOKEN_KEYS = [
  "confirmation_token",
  "invite_token",
  "recovery_token",
  "email_change_token"
] as const;

// Pages that run their own handleAuthCallback() and should not be
// double-processed by the global handler.
const SELF_HANDLED_PATHS = ["/reset-password", "/auth/callback"];

function hashHasIdentityToken(hash: string): boolean {
  if (!hash) return false;
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment);
  return TOKEN_KEYS.some((key) => params.has(key));
}

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

/**
 * Netlify Identity (the default email templates) sends confirmation,
 * invite, recovery and email-change links to `${SiteURL}/#<token>=...`,
 * which lands on the marketing root rather than a dedicated callback
 * route. Without a handler the hash token is never exchanged with
 * GoTrue, so the account is never actually confirmed. This component
 * mounts globally and processes the hash on whatever page the link
 * happens to land on.
 */
export function IdentityCallbackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SELF_HANDLED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    if (!hashHasIdentityToken(window.location.hash)) return;

    let cancelled = false;
    setProcessing(true);

    (async () => {
      let destination: Route = "/login?confirm_error=1" as Route;
      try {
        const result = await handleAuthCallback();
        destination = destinationForResult(result?.type);
      } catch {
        destination = "/login?confirm_error=1" as Route;
      } finally {
        // Strip the consumed token from the visible URL.
        if (typeof window !== "undefined" && window.location.hash) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, "", cleanUrl);
        }
        if (!cancelled) router.replace(destination);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!processing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 px-4 text-center">
      <div className="space-y-2">
        <p className="text-base font-semibold text-[#0A2540]">Confirming your account…</p>
        <p className="text-sm text-slate-600">One moment while we verify your link.</p>
      </div>
    </div>
  );
}
