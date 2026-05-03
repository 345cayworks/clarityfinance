import type { AdminUserRow } from "@/lib/types/admin";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function statusTone(value: string | null | undefined) {
  if (value === "active" || value === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (value === "deactivated" || value === "rejected") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function AdminUsersPanel({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No users found.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">User accounts</h2>
          <p className="text-sm text-slate-600">Review role, approval status, account status, and recent activity.</p>
        </div>
        <p className="text-xs font-medium text-slate-500">{users.length} total users</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Approval</div>
          <div className="col-span-2">Account</div>
          <div className="col-span-2">Last active</div>
        </div>
        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <div className="col-span-12 sm:col-span-4">
              <p className="font-semibold text-[#0A2540]">{user.name || "Unnamed user"}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="col-span-6 sm:col-span-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">{user.role ?? "user"}</span></div>
            <div className="col-span-6 sm:col-span-2"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(user.approval_status)}`}>{user.approval_status ?? "unknown"}</span></div>
            <div className="col-span-6 sm:col-span-2"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(user.account_status)}`}>{user.account_status ?? "unknown"}</span></div>
            <div className="col-span-6 sm:col-span-2 text-xs text-slate-600">{formatDate(user.last_active_at ?? user.last_login_at ?? user.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
