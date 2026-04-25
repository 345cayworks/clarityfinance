import Link from "next/link";
import { Logo } from "@/components/logo";
import { PasswordField } from "@/components/auth/password-field";
import { ApiAuthForm } from "@/components/auth/api-auth-form";

export default function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token ?? "";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Finance</p>
        <h1 className="mt-6 text-2xl font-semibold text-[#0A2540]">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-600">Choose a new password for your Clarity Finance account.</p>

        {!token ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Invalid link. Request a new reset email.</div> : null}

        {token ? (
          <ApiAuthForm endpoint="/.netlify/functions/password-reset-confirm" redirectOnSuccess="/login" className="mt-5 space-y-3">
            <input type="hidden" name="token" value={token} />
            <PasswordField name="password" required minLength={8} label="New password" autoComplete="new-password" placeholder="At least 8 characters" />
            <PasswordField name="confirmPassword" required minLength={8} label="Confirm new password" autoComplete="new-password" placeholder="Re-enter new password" />
            <button className="w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white">Reset password</button>
          </ApiAuthForm>
        ) : null}

        <p className="mt-4 text-sm text-slate-600">Back to <Link href="/login" className="font-medium text-blue-600 hover:underline">login</Link></p>
      </div>
    </div>
  );
}
