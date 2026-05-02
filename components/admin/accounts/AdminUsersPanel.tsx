import type { AdminUserRow } from "@/lib/types/admin";
export function AdminUsersPanel({ users }: { users: AdminUserRow[] }) { return <div className="space-y-2">{users.map((u)=><div key={u.id} className="rounded border p-2 text-sm">{u.email} · {u.role ?? "user"}</div>)}</div>; }
