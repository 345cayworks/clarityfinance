import Link from "next/link";
import { Logo } from "@/components/logo";

const links: Array<{ href: "/features" | "/pricing" | "/about" | "/contact"; label: string }> = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between py-4">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[#0A2540]">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-[#0A2540] sm:inline-flex"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[#0A2540] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
