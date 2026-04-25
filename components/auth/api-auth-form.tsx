"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  endpoint: string;
  redirectOnSuccess?: string;
  children: React.ReactNode;
  className?: string;
};

export function ApiAuthForm({ endpoint, redirectOnSuccess, children, className }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className={className}
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const formData = new FormData(event.currentTarget);
        const payload = Object.fromEntries(formData.entries());

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));

        setLoading(false);

        if (!response.ok) {
          setError(result.error ?? "Something went wrong.");
          return;
        }

        if (result.message) setMessage(result.message);
        const target = result.redirectTo ?? redirectOnSuccess;
        if (target) router.push(target);
      }}
    >
      {children}
      {error ? <p className="mt-3 text-sm text-amber-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {loading ? <p className="mt-3 text-xs text-slate-500">Working...</p> : null}
    </form>
  );
}
