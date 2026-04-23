"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      mode,
      redirect: false
    });

    setBusy(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <form className="card mx-auto mt-12 max-w-md space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h1>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button className="btn-primary" disabled={busy} type="submit">{busy ? "Working..." : mode === "login" ? "Sign in" : "Sign up"}</button>
    </form>
  );
}
