import Link from "next/link";
import type { Route } from "next";

type PremiumLockedCardProps = {
  title?: string;
  description?: string;
  featureName: string;
  backHref?: Route;
  upgradeHref?: Route;
};

export function PremiumLockedCard({
  title = "Premium Tool",
  description = "This calculator is available to Premium members, Advisors, and Admins.",
  featureName,
  backHref = "/app/tools",
  upgradeHref
}: PremiumLockedCardProps) {
  return (
    <section className="card border border-amber-200 bg-amber-50/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Premium
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700">{title}</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Upgrade to use this tool</h1>
          <p className="mt-2 text-sm text-amber-900">{description}</p>
          <p className="mt-2 text-sm text-slate-600">{featureName} is locked on your current plan.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {upgradeHref ? (
          <Link href={upgradeHref} className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]">
            Upgrade to Premium
          </Link>
        ) : (
          <Link href={backHref} className="rounded-lg bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]">
            Upgrade to Premium
          </Link>
        )}
        <Link href={backHref} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400">
          Back to Tools
        </Link>
      </div>
      {!upgradeHref ? <p className="mt-3 text-xs text-slate-500">TODO: connect this CTA to the Premium upgrade flow when available.</p> : null}
    </section>
  );
}
