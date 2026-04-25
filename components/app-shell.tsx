"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

const nav = [
  ["Dashboard", "/app/dashboard"],
  ["Onboarding", "/app/onboarding"],
  ["Profile", "/app/profile"],
  ["Mortgage", "/app/tools/mortgage"],
  ["Refinance", "/app/tools/refinance"],
  ["Rent a Room", "/app/tools/rent-room"],
  ["Debt Plan", "/app/tools/debt-plan"],
  ["Scenarios", "/app/scenarios"],
  ["Action Plan", "/app/action-plan"],
  ["Reports", "/app/reports"],
  ["Settings", "/app/settings"]
] satisfies ReadonlyArray<readonly [string, Route]>;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit">
          <p className="mb-4 text-lg font-semibold text-[#0A2540]">Clarity Finance</p>
          <div className="flex flex-col gap-2 text-sm">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-slate-100">
                {label}
              </Link>
            ))}
          </div>
          <button
            className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={async () => {
              await fetch("/.netlify/functions/auth-logout", {
                method: "POST",
                credentials: "include"
              });
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
