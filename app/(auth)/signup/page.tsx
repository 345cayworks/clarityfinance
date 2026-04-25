import Link from "next/link";
import { signupAction } from "@/lib/actions/finance";
import { Logo } from "@/components/logo";

export default function SignupPage({ searchParams }: { searchParams?: { error?: string } }) {
  const error = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold text-[#0A2540]">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Know where you stand. Know what&apos;s next.</p>

        {error ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

        <form action={signupAction} className="mt-5 space-y-3">
          <input name="name" type="text" required placeholder="Full name" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <input name="password" type="password" required minLength={8} placeholder="Password (min 8 characters)" className="w-full rounded-lg border border-slate-300 p-2.5" />
          <button className="w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white">Sign up</button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
