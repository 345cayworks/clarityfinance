"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { openLogin } from "@/lib/auth/netlify-identity";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <div className="mx-auto max-w-md card">
        <Logo />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">Clarity Finance</p>
        <h1 className="mt-6 text-2xl font-semibold text-[#0A2540]">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-600">Open the Netlify Identity login popup and select the password recovery option.</p>

        <button
          className="mt-5 w-full rounded-lg bg-blue-600 p-2.5 font-medium text-white"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await openLogin();
            setLoading(false);
          }}
        >
          {loading ? "Opening..." : "Open password recovery"}
        </button>

        <p className="mt-4 text-sm text-slate-600">
          Back to <Link href="/login" className="font-medium text-blue-600 hover:underline">login</Link>
        </p>
      </div>
    </div>
  );
}
