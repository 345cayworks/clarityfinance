export function MetricCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
        {note ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{note}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold text-brandBlue">{value}</p>
    </article>
  );
}
