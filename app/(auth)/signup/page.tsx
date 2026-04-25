import Link from "next/link";
import { Logo } from "@/components/logo";
import { PasswordField } from "@/components/auth/password-field";
import { ApiAuthForm } from "@/components/auth/api-auth-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Finance</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#0A2540]">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Know where you stand. Know what&apos;s next.</p>

        <ApiAuthForm endpoint="/.netlify/functions/auth-signup" redirectOnSuccess="/app/onboarding" className="mt-5 space-y-3">
          <input name="name" type="text" required placeholder="Full name" autoComplete="name" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <input name="email" type="email" required placeholder="Email" autoComplete="email" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <PasswordField name="password" required minLength={8} label="Password" autoComplete="new-password" placeholder="At least 8 characters" />
          <PasswordField name="confirmPassword" required minLength={8} label="Confirm password" autoComplete="new-password" placeholder="Re-enter password" />
          <button className="w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white">Sign up</button>
        </ApiAuthForm>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
