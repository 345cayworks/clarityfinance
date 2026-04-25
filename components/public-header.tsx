import Link from "next/link";
import { Logo } from "@/components/logo";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-6">
      <Logo />
      <nav className="flex gap-5 text-sm text-slate-600">
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/about">About</Link>
        <Link href="/login" className="font-semibold text-blue-600">Login</Link>
      </nav>
    </header>
  );
}
