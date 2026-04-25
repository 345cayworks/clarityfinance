"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { initIdentity, onIdentityEvent, openLogin } from "@/lib/auth/netlify-identity";

const DEFAULT_CALLBACK_URL: Route = "/app/dashboard";

type SafeAppRoute = Route;

function getSafeCallbackUrl(callbackUrl: string | null): SafeAppRoute {
  if (!callbackUrl || !callbackUrl.startsWith("/app/")) return DEFAULT_CALLBACK_URL;
  return callbackUrl as SafeAppRoute;
}

export default function LoginPage() {
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

      const offLogin = await onIdentityEvent("login", () => {
        router.replace(redirectOnSuccess);
      });

      const offInit = await onIdentityEvent("init", (user) => {
        if (user) {
          router.replace(redirectOnSuccess);
        }
      });

      return () => {
        offLogin();
        offInit();
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
        <h1 className="mt-6 text-2xl font-semibold text-[#0A2540]">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Know where you stand. Know what&apos;s next.</p>

        <button
          className="mt-5 w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await openLogin();
            setLoading(false);
          }}
        >
          {loading ? "Opening login..." : "Login with Netlify Identity"}
        </button>

        <p className="mt-3 text-sm text-slate-600">
          Forgot password? Use the <span className="font-medium">Forgot password</span> link inside the Netlify Identity login popup.
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href={`/signup?callbackUrl=${encodeURIComponent(redirectOnSuccess)}`} className="font-medium text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
