import type { AdminUserRow } from "@/lib/types/admin";
export function AdminDeactivatedUsersPanel({ users }: { users: AdminUserRow[] }) { return <div className="space-y-2">{users.filter((u)=>u.account_status==="deactivated").map((u)=><div key={u.id} className="rounded border p-2 text-sm">{u.email}</div>)}</div>; }
