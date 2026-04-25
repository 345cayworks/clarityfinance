"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import { describeAuthError, getUser, signupWithEmail } from "@/lib/auth/netlify-identity";

const DEFAULT_REDIRECT: Route = "/app/onboarding";

function getSafeCallbackUrl(callbackUrl: string | null): Route {
  if (!callbackUrl || !callbackUrl.startsWith("/app/")) return DEFAULT_REDIRECT;
  return callbackUrl as Route;
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

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
    setConfirmationMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const user = await signupWithEmail(email, password, name);
      if (user.confirmedAt) {
        router.replace(redirectOnSuccess);
        return;
      }
      setConfirmationMessage(
        "Account created. Please check your email to confirm your address — then sign in to continue."
      );
      setLoading(false);
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It only takes a minute. We'll guide you through onboarding next."
      side={{
        eyebrow: "Clarity Finance",
        heading: "Your money picture, simplified.",
        body: "Build your profile once and unlock a live dashboard, calculators, scenarios and a guided plan.",
        bullets: [
          "Connected onboarding wizard",
          "Mortgage, refinance and debt tools",
          "Save scenarios and reports"
        ]
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(redirectOnSuccess)}`}
            className="font-semibold text-blue-700 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          name="name"
          autoComplete="name"
          required
          label="Full name"
          placeholder="Jane Doe"
        />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          required
          label="Email"
          placeholder="you@example.com"
        />
        <PasswordField
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          label="Password"
          placeholder="At least 8 characters"
        />
        <PasswordField
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          label="Confirm password"
          placeholder="Re-enter password"
        />
        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
        ) : null}
        {confirmationMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {confirmationMessage}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-xs text-slate-500">
          By creating an account you agree to our terms of service and privacy policy.
        </p>
      </form>
    </AuthLayout>
  );
}
