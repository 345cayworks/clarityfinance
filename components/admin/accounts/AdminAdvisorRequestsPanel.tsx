import type { AdminAdvisorRequestRow } from "@/lib/types/admin";
export function AdminAdvisorRequestsPanel({ advisorRequests }: { advisorRequests: AdminAdvisorRequestRow[] }) { return <div className="space-y-2">{advisorRequests.map((r)=><div key={r.id} className="rounded border p-2 text-sm">{r.email} · {r.status}</div>)}</div>; }
