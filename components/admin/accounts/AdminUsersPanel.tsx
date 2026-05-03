"use client";

import { useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import { sendAdminPasswordReset } from "@/lib/admin/adminAccountsApi";
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

export function AdminUsersPanel({ users, currentUser }: { users: AdminUserRow[]; currentUser: IdentityUser | null }) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handlePasswordReset(target: AdminUserRow) {
    setBusyUserId(target.id);
    setMessage("");
    try {
      const result = await sendAdminPasswordReset(currentUser, target.id, target.email);
      setMessage(result.message ?? `Password reset email sent to ${target.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send password reset email.");
    } finally {
      setBusyUserId(null);
    }
  }

  if (users.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No users found.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">User accounts</h2>
          <p className="text-sm text-slate-600">Review role, approval status, account status, recent activity, and password support actions.</p>
        </div>
        <p className="text-xs font-medium text-slate-500">{users.length} total users</p>
      </div>

      {message ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Approval</div>
          <div className="col-span-2">Account</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-2">Actions</div>
        </div>
        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <div className="col-span-12 md:col-span-3">
              <p className="font-semibold text-[#0A2540]">{user.name || "Unnamed user"}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="col-span-6 md:col-span-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">{user.role ?? "user"}</span></div>
            <div className="col-span-6 md:col-span-2"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(user.approval_status)}`}>{user.approval_status ?? "unknown"}</span></div>
            <div className="col-span-6 md:col-span-2"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(user.account_status)}`}>{user.account_status ?? "unknown"}</span></div>
            <div className="col-span-6 text-xs text-slate-600 md:col-span-1">{formatDate(user.last_active_at ?? user.last_login_at ?? user.created_at)}</div>
            <div className="col-span-12 md:col-span-2">
              <button
                type="button"
                onClick={() => void handlePasswordReset(user)}
                disabled={busyUserId === user.id}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyUserId === user.id ? "Sending…" : "Send reset email"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Password support sends Netlify Identity recovery email. Users choose their own new password from the secure recovery link.
      </p>
    </div>
  );
}
