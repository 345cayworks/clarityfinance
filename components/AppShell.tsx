"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  ["/app", "Dashboard"],
  ["/app/onboarding", "Onboarding"],
  ["/app/profile", "Profile"],
  ["/app/mortgage", "Mortgage"],
  ["/app/refinance", "Refinance"],
  ["/app/rent-room", "Rent a Room"],
  ["/app/debt-plan", "Debt Plan"],
  ["/app/scenarios", "Scenarios"],
  ["/app/action-plan", "Action Plan"]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-brandBlue">Clarity Finance</Link>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">Know where you stand. Know what&apos;s next.</p>
            {session?.user?.email ? <p className="text-xs text-slate-500">{session.user.email}</p> : null}
            <button className="btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`mb-1 block rounded-xl px-3 py-2 text-sm ${pathname === href ? "bg-brandBlue text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {label}
            </Link>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
