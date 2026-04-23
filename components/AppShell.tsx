"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/app", "Dashboard"],
  ["/app/onboarding", "Onboarding"],
  ["/app/mortgage", "Mortgage"],
  ["/app/refinance", "Refinance"],
  ["/app/rent-room", "Rent a Room"],
  ["/app/debt-plan", "Debt Plan"],
  ["/app/scenarios", "Scenarios"],
  ["/app/action-plan", "Action Plan"]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-brandBlue">Clarity Finance</Link>
          <p className="text-sm text-slate-500">Know where you stand. Know what&apos;s next.</p>
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
