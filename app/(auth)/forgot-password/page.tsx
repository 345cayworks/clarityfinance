"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { TextField } from "@/components/auth/text-field";
import { describeAuthError, requestPasswordRecovery } from "@/lib/auth/netlify-identity";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      await requestPasswordRecovery(email);
      setSent(true);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email associated with your account. We'll send you a recovery link."
      side={{
        eyebrow: "Account recovery",
        heading: "We'll get you back in.",
        body: "Password recovery is sent to your email. The link logs you in and lets you set a new password.",
        bullets: ["One-time recovery email", "Link logs you in directly", "Set a new password in seconds"]
      }}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            If an account exists for that email, a recovery link is on its way. Check your inbox (and spam folder).
          </div>
          <Link
            href="/login"
            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField
            name="email"
            type="email"
            autoComplete="email"
            required
            label="Email"
            placeholder="you@example.com"
          />
          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending…" : "Send recovery link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
