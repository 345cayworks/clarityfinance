import type { AdminUserRow } from "@/lib/types/admin";
export function AdminApprovalsPanel({ users }: { users: AdminUserRow[] }) { return <div className="space-y-2">{users.filter((u)=>u.approval_status==="pending").map((u)=><div key={u.id} className="rounded border p-2 text-sm">Pending: {u.email}</div>)}</div>; }
