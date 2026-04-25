import Link from "next/link";
import { Logo } from "@/components/logo";
import { PasswordField } from "@/components/auth/password-field";
import { ApiAuthForm } from "@/components/auth/api-auth-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold text-[#0A2540]">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Know where you stand. Know what&apos;s next.</p>

        <ApiAuthForm endpoint="/.netlify/functions/auth-login" redirectOnSuccess="/app/dashboard" className="mt-5 space-y-3">
          <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <PasswordField name="password" required placeholder="Password" autoComplete="current-password" />
          <button className="w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white">Login</button>
        </ApiAuthForm>

        <p className="mt-3 text-sm text-slate-600">
          <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
