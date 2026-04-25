"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordField } from "@/components/auth/password-field";
import {
  describeAuthError,
  getUser,
  handleAuthCallback,
  updateUser
} from "@/lib/auth/netlify-identity";

type Status = "checking" | "ready" | "saved" | "expired";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await handleAuthCallback();
        if (cancelled) return;
        if (result?.type === "recovery") {
          setStatus("ready");
          return;
        }
        const user = await getUser();
        if (cancelled) return;
        setStatus(user ? "ready" : "expired");
      } catch (err) {
        if (cancelled) return;
        setError(describeAuthError(err));
        setStatus("expired");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
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
      await updateUser({ password });
      setStatus("saved");
      setTimeout(() => router.replace("/app/dashboard"), 800);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you don't use elsewhere."
      side={{
        eyebrow: "Account recovery",
        heading: "Almost there.",
        body: "Set a new password to finish recovery — you'll be signed in automatically.",
        bullets: ["At least 8 characters", "Avoid reusing other passwords", "We'll log you in right after"]
      }}
      footer={
        <>
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {status === "checking" ? (
        <p className="text-sm text-slate-600">Verifying your recovery link…</p>
      ) : null}

      {status === "expired" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            {error ?? "This recovery link is invalid or has expired. Request a new one to continue."}
          </div>
          <Link
            href="/forgot-password"
            className="block w-full rounded-lg bg-[#0A2540] px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            Request a new link
          </Link>
        </div>
      ) : null}

      {status === "ready" ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <PasswordField
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            label="New password"
            placeholder="At least 8 characters"
          />
          <PasswordField
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            label="Confirm new password"
            placeholder="Re-enter password"
          />
          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Saving…" : "Save new password"}
          </button>
        </form>
      ) : null}

      {status === "saved" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Password updated. Taking you to your dashboard…
        </div>
      ) : null}
    </AuthLayout>
  );
}
