export function EmptyState({ title, helper }: { title: string; helper: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="font-medium text-slate-700">{title}</p><p className="text-sm text-slate-500">{helper}</p></div>;
}
