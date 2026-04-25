"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import { describeAuthError, getUser, loginWithEmail } from "@/lib/auth/netlify-identity";

const DEFAULT_CALLBACK_URL: Route = "/app/dashboard";

function getSafeCallbackUrl(callbackUrl: string | null): Route {
  if (!callbackUrl || !callbackUrl.startsWith("/app/")) return DEFAULT_CALLBACK_URL;
  return callbackUrl as Route;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectOnSuccess = useMemo(
    () => getSafeCallbackUrl(searchParams.get("callbackUrl")),
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    getUser()
      .then((user) => {
        if (!cancelled && user) router.replace(redirectOnSuccess);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [redirectOnSuccess, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await loginWithEmail(email, password);
      router.replace(redirectOnSuccess);
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to view your dashboard, scenarios, and action plan."
      side={{
        eyebrow: "Clarity Finance",
        heading: "Pick up where you left off.",
        body: "Your numbers, scenarios and plan are right where you saved them.",
        bullets: ["Live financial snapshot", "Cross-device session", "Secure email + password sign-in"]
      }}
      footer={
        <>
          New to Clarity Finance?{" "}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(redirectOnSuccess)}`}
            className="font-semibold text-blue-700 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          required
          label="Email"
          placeholder="you@example.com"
        />
        <div className="space-y-1.5">
          <PasswordField
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            label="Password"
            placeholder="At least 8 characters"
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-blue-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
