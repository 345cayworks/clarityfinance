"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/calculators", label: "Calculators" },
  { href: "/scenario", label: "Scenario Engine" },
  { href: "/action-plan", label: "Action Plan" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-r border-slate-200 bg-slate-50 p-4 md:w-64">
      <h2 className="mb-6 text-xl font-bold text-brandBlue">Clarity Finance</h2>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === item.href ? "bg-brandBlue text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
