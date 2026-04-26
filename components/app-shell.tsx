"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useWorkspaceUser } from "@/components/auth/workspace-guard";
import { Logo } from "@/components/logo";
import { logout } from "@/lib/auth/netlify-identity";

type NavItem = { label: string; href: Route; icon: ReactNode };
type NavSection = { title: string; items: NavItem[] };

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    {children}
  </svg>
);

const navSections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/app/dashboard",
        icon: (
          <Icon>
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </Icon>
        )
      },
      {
        label: "Profile / Onboarding",
        href: "/app/onboarding",
        icon: (
          <Icon>
            <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </Icon>
        )
      },
      {
        label: "Reports",
        href: "/app/report",
        icon: (
          <Icon>
            <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v5h5 M9 13h6 M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </Icon>
        )
      },
      {
        label: "Action Plan",
        href: "/app/action-plan",
        icon: (
          <Icon>
            <path d="M9 11l3 3 7-7M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </Icon>
        )
      },
      {
        label: "Tools",
        href: "/app/tools",
        icon: (
          <Icon>
            <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </Icon>
        )
      }
    ]
  }
];

function getInitials(nameOrEmail: string) {
  const parts = nameOrEmail.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
          <div className="flex flex-col gap-0.5 text-sm">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                    active
                      ? "bg-blue-50 font-semibold text-[#0A2540]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#0A2540]"
                  }`}
                >
                  <span className={active ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function findActiveLabel(pathname: string) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return item.label;
      }
    }
  }
  return "Workspace";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useWorkspaceUser();

  const displayName = user?.name || user?.email || "Account";
  const subtitle = user?.email ?? "Signed in";
  const activeLabel = findActiveLabel(pathname);

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[260px] flex-none flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex">
          <Logo />
          <div className="mt-6 flex-1 overflow-y-auto pr-1">
            <NavList pathname={pathname} />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#0A2540] text-xs font-semibold text-white">
              {getInitials(displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0A2540]">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Sign out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Clarity Finance</p>
                <h1 className="truncate text-base font-semibold text-[#0A2540]">{activeLabel}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-right text-sm md:block">
                <span className="block font-medium text-[#0A2540]">{displayName}</span>
                <span className="block text-xs text-slate-500">{subtitle}</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A2540] text-xs font-semibold text-white">
                {getInitials(displayName)}
              </span>
            </div>
          </header>
          <main className="min-w-0 flex-1 pb-12">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col gap-4 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={onLogout}
              className="mt-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
