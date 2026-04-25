import Link from "next/link";
import { Logo } from "@/components/logo";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: {
    eyebrow: string;
    heading: string;
    body: string;
    bullets?: string[];
  };
};

const defaultSide = {
  eyebrow: "Clarity Finance",
  heading: "Know where you stand. Know what's next.",
  body: "Sign in to access your dashboard, scenarios and guided action plan.",
  bullets: ["Live Clarity Score", "Practical what-if scenarios", "Guided 30/90/365-day plan"]
};

export function AuthLayout({ title, subtitle, children, footer, side = defaultSide }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#0A2540] via-[#102f5f] to-[#1d4ed8] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M4 17 L9 11 L13 14 L20 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="6" r="1.8" fill="currentColor" />
              </svg>
            </span>
            <span className="text-base font-semibold">Clarity Finance</span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">{side.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">{side.heading}</h2>
          <p className="mt-3 text-sm text-blue-100/80">{side.body}</p>
          {side.bullets ? (
            <ul className="mt-6 space-y-2 text-sm text-blue-50/90">
              {side.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="text-xs text-blue-100/70">© {new Date().getFullYear()} Clarity Finance</p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl"
        />
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="mt-8 lg:mt-0">
            <h1 className="text-2xl font-semibold text-[#0A2540]">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
          {footer ? <div className="mt-5 text-center text-sm text-slate-600">{footer}</div> : null}
        </div>
      </section>
    </div>
  );
}
