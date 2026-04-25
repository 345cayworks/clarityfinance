import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/finance";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage({ searchParams }: { searchParams?: { success?: string; error?: string } }) {
  const success = searchParams?.success ? decodeURIComponent(searchParams.success) : null;
  const error = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Finance</p>
        <h1 className="mt-6 text-2xl font-semibold text-[#0A2540]">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-600">Know where you stand. Know what&apos;s next.</p>
        <p className="mt-1 text-sm text-slate-600">Enter your email and we&apos;ll send reset instructions.</p>

        {success ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div> : null}
        {error ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

        <form action={requestPasswordResetAction} className="mt-5 space-y-3">
          <input name="email" type="email" required placeholder="Email" autoComplete="email" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <button className="w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white">Send reset link</button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
