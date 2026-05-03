import type { AdminUserRow } from "@/lib/types/admin";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function AdminApprovalsPanel({ users }: { users: AdminUserRow[] }) {
  const pendingUsers = users.filter((user) => user.approval_status === "pending");

  if (pendingUsers.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        No pending approvals. New signups will appear here for review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Pending approvals</h2>
        <p className="text-sm text-slate-600">Review new users before granting full access.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {pendingUsers.map((user) => (
          <article key={user.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#0A2540]">{user.name || "Unnamed user"}</h3>
                <p className="text-sm text-slate-600">{user.email}</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Pending</span>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-700">Role:</span> {user.role ?? "user"}</p>
              <p><span className="font-semibold text-slate-700">Account:</span> {user.account_status ?? "unknown"}</p>
              <p><span className="font-semibold text-slate-700">Created:</span> {formatDate(user.created_at)}</p>
              <p><span className="font-semibold text-slate-700">Last active:</span> {formatDate(user.last_active_at ?? user.last_login_at)}</p>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              Phase 1 view only. Approval/rejection action buttons will be wired in Phase 2.
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
