"use client";

import { useMemo, useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import { assignAdvisorToRequest, updateAdvisorRequest } from "@/lib/admin/adminAccountsApi";
import type { AdminAdvisorRequestRow, AdvisorOption } from "@/lib/types/admin";

const statusOptions = ["reviewing", "contacted", "closed"];

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
  if (normalized.includes("complete") || normalized.includes("closed")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized.includes("assigned") || normalized.includes("review")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized.includes("new") || normalized.includes("pending")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function AdminAdvisorRequestsPanel({
  advisorRequests,
  advisors,
  currentUser,
  onRefresh
}: {
  advisorRequests: AdminAdvisorRequestRow[];
  advisors: AdvisorOption[];
  currentUser: IdentityUser | null;
  onRefresh?: () => Promise<void> | void;
}) {
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedAdvisors, setSelectedAdvisors] = useState<Record<string, string>>({});
  const [statusByRequest, setStatusByRequest] = useState<Record<string, string>>({});
  const [advisorNotes, setAdvisorNotes] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const advisorLookup = useMemo(() => new Map(advisors.map((advisor) => [advisor.id, advisor])), [advisors]);

  async function runAction(request: AdminAdvisorRequestRow, label: string, action: () => Promise<{ message?: string } | void>) {
    setBusyRequestId(request.id);
    setMessage("");
    try {
      const result = await action();
      setMessage(result?.message ?? `${label} completed for ${request.email}.`);
      await onRefresh?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} failed.`);
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleAssign(request: AdminAdvisorRequestRow) {
    const advisorId = selectedAdvisors[request.id] || request.assigned_advisor_id || "";
    const advisor = advisorLookup.get(advisorId);
    if (!advisor) {
      setMessage("Select an eligible advisor first.");
      return;
    }
    await runAction(request, request.assigned_advisor_id ? "Reassign advisor" : "Assign advisor", () =>
      assignAdvisorToRequest(currentUser, request.id, advisor.id, advisor.email)
    );
  }

  async function handleStatusUpdate(request: AdminAdvisorRequestRow) {
    const status = statusByRequest[request.id] || request.status || "reviewing";
    await runAction(request, "Status update", () => updateAdvisorRequest(currentUser, request.id, { status }));
  }

  async function handleNotesUpdate(request: AdminAdvisorRequestRow) {
    await runAction(request, "Notes update", () =>
      updateAdvisorRequest(currentUser, request.id, {
        advisorNotes: advisorNotes[request.id] ?? request.advisor_notes ?? "",
        adminNotes: adminNotes[request.id] ?? request.admin_notes ?? ""
      })
    );
  }

  if (advisorRequests.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No advisor requests found.</div>;
  }

  const unassignedCount = advisorRequests.filter((request) => !request.assigned_advisor_id && !request.assigned_advisor_email).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Advisor requests</h2>
          <p className="text-sm text-slate-600">Assign advisors, update request status, and maintain admin/advisor notes.</p>
        </div>
        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {unassignedCount} unassigned
        </div>
      </div>

      {message ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {advisorRequests.map((request) => {
          const assigned = Boolean(request.assigned_advisor_id || request.assigned_advisor_email);
          const busy = busyRequestId === request.id;
          const selectedAdvisorId = selectedAdvisors[request.id] ?? request.assigned_advisor_id ?? "";
          const selectedStatus = statusByRequest[request.id] ?? request.status ?? "reviewing";
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

              <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
                  <select
                    value={selectedAdvisorId}
                    onChange={(event) => setSelectedAdvisors((current) => ({ ...current, [request.id]: event.target.value }))}
                    disabled={busy || advisors.length === 0}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">Select advisor</option>
                    {advisors.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>{advisor.name || advisor.email} · {advisor.role}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => void handleAssign(request)} disabled={busy || !selectedAdvisorId} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-400 disabled:opacity-60">
                    {assigned ? "Reassign" : "Assign"}
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
                  <select
                    value={selectedStatus}
                    onChange={(event) => setStatusByRequest((current) => ({ ...current, [request.id]: event.target.value }))}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                  >
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button type="button" onClick={() => void handleStatusUpdate(request)} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60">
                    Update status
                  </button>
                </div>

                <div className="grid gap-2">
                  <textarea
                    value={advisorNotes[request.id] ?? request.advisor_notes ?? ""}
                    onChange={(event) => setAdvisorNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    rows={2}
                    placeholder="Advisor-facing notes"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <textarea
                    value={adminNotes[request.id] ?? request.admin_notes ?? ""}
                    onChange={(event) => setAdminNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    rows={2}
                    placeholder="Internal admin notes"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => void handleNotesUpdate(request)} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60">
                    {busy ? "Saving…" : "Save notes"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
