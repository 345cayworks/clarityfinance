type MetricCard = {
  label: string;
  value: number;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
  helper?: string;
};

const toneClasses: Record<NonNullable<MetricCard["tone"]>, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-800",
  green: "border-emerald-100 bg-emerald-50 text-emerald-800",
  amber: "border-amber-100 bg-amber-50 text-amber-800",
  red: "border-red-100 bg-red-50 text-red-800",
  slate: "border-slate-100 bg-slate-50 text-slate-800"
};

const metricLabels: Record<string, Omit<MetricCard, "value">> = {
  standardUsers: { label: "Standard Users", tone: "slate", helper: "Base accounts" },
  premiumUsers: { label: "Premium Users", tone: "green", helper: "Higher-value users" },
  advisors: { label: "Advisors", tone: "blue", helper: "Support capacity" },
  admins: { label: "Admins", tone: "slate", helper: "Platform operators" },
  pendingUsers: { label: "Pending Approval", tone: "amber", helper: "Needs review" },
  unassignedRequests: { label: "Unassigned Cases", tone: "red", helper: "Needs assignment" }
};

export function AdminOverviewPanel({ metrics }: { metrics: Record<string, number> }) {
  const cards = Object.entries(metrics).map(([key, value]) => ({
    ...(metricLabels[key] ?? { label: key, tone: "slate" as const }),
    value
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-4 ${toneClasses[card.tone ?? "slate"]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
            {card.helper ? <p className="mt-1 text-xs opacity-80">{card.helper}</p> : null}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-[#0A2540]">Admin priorities</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <PriorityCard title="Review approvals" value={metrics.pendingUsers ?? 0} body="Approve legitimate users and keep stalled accounts moving." />
          <PriorityCard title="Assign advisor cases" value={metrics.unassignedRequests ?? 0} body="Make sure premium/advisor requests do not sit unassigned." />
          <PriorityCard title="Monitor account mix" value={(metrics.premiumUsers ?? 0) + (metrics.advisors ?? 0)} body="Track premium users and support capacity as the platform grows." />
        </div>
      </div>
    </div>
  );
}

function PriorityCard({ title, value, body }: { title: string; value: number; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[#0A2540]">{title}</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">{value}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
