import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />
      <h1 className="max-w-2xl text-4xl font-bold text-slate-900 md:text-5xl">Financial confidence starts with clarity.</h1>
      <p className="max-w-2xl text-lg text-slate-600">
        Build your profile, track score signals, test scenarios, and execute your action plan.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="btn-primary">Get Started</Link>
        <Link href="/login" className="btn-secondary">Login</Link>
      </div>
    </main>
  );
}
