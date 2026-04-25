import Link from "next/link";

type LogoProps = {
  variant?: "full" | "mark";
  className?: string;
};

export function Logo({ variant = "full", className = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <span
        aria-hidden
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1a3a6c] to-[#2563EB] text-white shadow-md"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
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
      {variant === "full" ? (
        <div className="flex flex-col leading-tight">
          <span className="font-semibold tracking-tight text-[#0A2540]">Clarity Finance</span>
          <span className="text-[11px] text-slate-500">Know where you stand. Know what&apos;s next.</span>
        </div>
      ) : null}
    </Link>
  );
}
