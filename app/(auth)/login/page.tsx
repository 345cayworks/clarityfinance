"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import { describeAuthError, getIdentityToken, getUser, loginWithEmail, logout } from "@/lib/auth/netlify-identity";

const DEFAULT_CALLBACK_URL: Route = "/app/dashboard";

function getSafeCallbackUrl(callbackUrl: string | null): Route {
  if (!callbackUrl || !callbackUrl.startsWith("/app/")) return DEFAULT_CALLBACK_URL;
  return callbackUrl as Route;
}

async function verifyAccountStatus(user: Awaited<ReturnType<typeof getUser>>) {
  const token = await getIdentityToken(user);
  if (!token) return { ok: false, authError: true };
  const response = await fetch("/.netlify/functions/account-status", {
    credentials: "same-origin",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.ok) return { ok: true, authError: false };
  return { ok: false, authError: response.status === 401 || response.status === 403 };
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

  const searchString = searchParams.toString();
  const callbackUrl = useMemo(() => new URLSearchParams(searchString).get("callbackUrl"), [searchString]);
  const redirectOnSuccess = useMemo(
    () => getSafeCallbackUrl(callbackUrl),
    [callbackUrl]
  );

  useEffect(() => {
    let cancelled = false;
    async function validateExistingSession() {
      try {
        const user = await getUser();
        if (cancelled || !user) return;
        const result = await verifyAccountStatus(user);
        if (cancelled) return;
        if (result.ok) {
          router.replace(redirectOnSuccess);
          return;
        }
        if (result.authError) {
          await logout().catch(() => undefined);
          if (!cancelled) setError("Your session expired. Please sign in again.");
          return;
        }
        setError("We could not verify your session. Please try again.");
      } catch {
        if (!cancelled) setError("We could not verify your session. Please try again.");
      }
    }
    validateExistingSession();
    return () => {
      cancelled = true;
    };
  }, [redirectOnSuccess, router]);

  async function redirectAfterVerifiedLogin(user: Awaited<ReturnType<typeof getUser>>) {
    const result = await verifyAccountStatus(user);
    if (result.ok) {
      router.replace(redirectOnSuccess);
      return true;
    }
    if (result.authError) {
      await logout().catch(() => undefined);
      setError("Your session expired. Please sign in again.");
      return false;
    }
    setError("We could not verify your account status. Please try again.");
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      const user = await loginWithEmail(email, password);
      const verified = await redirectAfterVerifiedLogin(user);
      if (!verified) setLoading(false);
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
