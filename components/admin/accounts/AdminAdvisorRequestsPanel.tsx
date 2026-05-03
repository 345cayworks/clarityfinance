import type { AdminAdvisorRequestRow } from "@/lib/types/admin";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function urgencyTone(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("urgent") || normalized.includes("high")) return "border-red-200 bg-red-50 text-red-700";
  if (normalized.includes("soon") || normalized.includes("medium")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusTone(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("complete") || normalized.includes("resolved")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized.includes("assigned") || normalized.includes("review")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized.includes("new") || normalized.includes("pending")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function AdminAdvisorRequestsPanel({ advisorRequests }: { advisorRequests: AdminAdvisorRequestRow[] }) {
  if (advisorRequests.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No advisor requests found.</div>;
  }

  const unassignedCount = advisorRequests.filter((request) => !request.assigned_advisor_id && !request.assigned_advisor_email).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Advisor requests</h2>
          <p className="text-sm text-slate-600">Track cases, urgency, assignment status, and next operational priority.</p>
        </div>
        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {unassignedCount} unassigned
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {advisorRequests.map((request) => {
          const assigned = Boolean(request.assigned_advisor_id || request.assigned_advisor_email);
          return (
            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#0A2540]">{request.name || request.email}</h3>
                  <p className="text-sm text-slate-600">{request.email}</p>
                  {request.phone ? <p className="text-xs text-slate-500">{request.phone}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(request.status)}`}>{request.status || "new"}</span>
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${urgencyTone(request.urgency)}`}>{request.urgency || "normal"}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-700">Topic:</span> {request.topic || "General review"}</p>
                <p><span className="font-semibold text-slate-700">Created:</span> {formatDate(request.created_at)}</p>
                <p><span className="font-semibold text-slate-700">Assigned:</span> {assigned ? request.assigned_advisor_name || request.assigned_advisor_email || "Assigned" : "Unassigned"}</p>
                <p><span className="font-semibold text-slate-700">Assigned at:</span> {formatDate(request.assigned_at)}</p>
              </div>

              {request.message ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 line-clamp-3">{request.message}</p> : null}

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Phase 1 view only. Assignment and status action buttons will be wired in Phase 2.
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
