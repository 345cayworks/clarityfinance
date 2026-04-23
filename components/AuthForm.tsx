"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      mode,
      redirect: false,
      callbackUrl: searchParams.get("callbackUrl") ?? "/app"
    });

    setSubmitting(false);

    if (!result || result.error) {
      setError(result?.error ?? "Unable to authenticate. Check configuration and try again.");
      return;
    }

    router.push(result.url ?? "/app");
    router.refresh();
  }

  return (
    <form className="card mx-auto max-w-md space-y-4" onSubmit={handleSubmit}>
      <h1 className="text-xl font-semibold">{mode === "signup" ? "Create your account" : "Sign in"}</h1>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button className="btn-primary" disabled={submitting} type="submit">{submitting ? "Please wait..." : mode === "signup" ? "Sign up" : "Sign in"}</button>
    </form>
  );
}
