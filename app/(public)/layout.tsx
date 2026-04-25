import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-slate-50 to-white px-4">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 pb-16">{children}</main>
      <footer className="mx-auto mt-10 w-full max-w-6xl border-t border-slate-200 py-8">
        <div className="flex flex-col items-start justify-between gap-4 text-sm text-slate-500 md:flex-row md:items-center">
          <Logo variant="mark" />
          <p>© {new Date().getFullYear()} Clarity Finance. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/features" className="hover:text-[#0A2540]">Features</Link>
            <Link href="/pricing" className="hover:text-[#0A2540]">Pricing</Link>
            <Link href="/about" className="hover:text-[#0A2540]">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
