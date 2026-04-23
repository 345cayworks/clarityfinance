import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <div className="relative h-9 w-9 rounded-full border-4 border-brandBlue">
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-brandTeal" />
      </div>
      <div>
        <p className="text-lg font-bold tracking-tight text-slate-900">Clarity Finance</p>
        <p className="text-xs text-slate-500">Know where you stand. Know what’s next.</p>
      </div>
    </Link>
  );
}
