"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { initIdentity, onIdentityEvent, openSignup } from "@/lib/auth/netlify-identity";

const DEFAULT_REDIRECT: Route = "/app/onboarding";

type SafeAppRoute = Route;

function getSafeCallbackUrl(callbackUrl: string | null): SafeAppRoute {
  if (!callbackUrl || !callbackUrl.startsWith("/app/")) return DEFAULT_REDIRECT;
  return callbackUrl as SafeAppRoute;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const redirectOnSuccess = useMemo(() => getSafeCallbackUrl(searchParams.get("callbackUrl")), [searchParams]);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const widget = await initIdentity();
      if (!widget || !mounted) return;

      const existingUser = widget.currentUser();
      if (existingUser) {
        router.replace(redirectOnSuccess);
        return;
      }

      const offSignup = await onIdentityEvent("signup", () => {
        router.replace(redirectOnSuccess);
      });
      const offLogin = await onIdentityEvent("login", () => {
        router.replace(redirectOnSuccess);
      });

      return () => {
        offSignup();
        offLogin();
      };
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [redirectOnSuccess, router]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Finance</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#0A2540]">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Know where you stand. Know what&apos;s next.</p>

        <button
          className="mt-5 w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await openSignup();
            setLoading(false);
          }}
        >
          {loading ? "Opening signup..." : "Sign up with Netlify Identity"}
        </button>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(redirectOnSuccess)}`} className="font-medium text-blue-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
