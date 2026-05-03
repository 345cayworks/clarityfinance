"use client";

import { useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import {
  activateAdminUser,
  approveAdminUser,
  deactivateAdminUser,
  rejectAdminUser,
  sendAdminPasswordReset,
  updateAdminUserRole
} from "@/lib/admin/adminAccountsApi";
import type { AdminUserRow } from "@/lib/types/admin";
import type { UserRole } from "@/lib/types/roles";

const roles: UserRole[] = ["user", "premium_user", "advisor", "admin", "superadmin"];

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

export function AdminUsersPanel({ users, currentUser, onRefresh }: { users: AdminUserRow[]; currentUser: IdentityUser | null; onRefresh?: () => Promise<void> | void }) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function runAction(target: AdminUserRow, label: string, action: () => Promise<{ message?: string; user?: AdminUserRow; success?: boolean } | void>) {
    setBusyUserId(target.id);
    setMessage("");
    try {
      const result = await action();
      setMessage(result?.message ?? `${label} completed for ${target.email}.`);
      await onRefresh?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} failed.`);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handlePasswordReset(target: AdminUserRow) {
    await runAction(target, "Password reset", () => sendAdminPasswordReset(currentUser, target.id, target.email));
  }

  async function handleRoleChange(target: AdminUserRow, role: UserRole) {
    await runAction(target, "Role update", () => updateAdminUserRole(currentUser, target.id, role));
  }

  async function handleReject(target: AdminUserRow) {
    await runAction(target, "Reject user", () => rejectAdminUser(currentUser, target.id, rejectReason));
    setRejectingUserId(null);
    setRejectReason("");
  }

  if (users.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No users found.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">User accounts</h2>
          <p className="text-sm text-slate-600">Review and manage role, approval, activation, and password support actions.</p>
        </div>
        <p className="text-xs font-medium text-slate-500">{users.length} total users</p>
      </div>

      {message ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-4">Actions</div>
        </div>
        {users.map((user) => {
          const busy = busyUserId === user.id;
          const isDeactivated = user.account_status === "deactivated";
          const isPending = user.approval_status === "pending";
          const isRejected = user.approval_status === "rejected";
          return (
            <div key={user.id} className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0">
              <div className="col-span-12 xl:col-span-3">
                <p className="font-semibold text-[#0A2540]">{user.name || "Unnamed user"}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <div className="col-span-12 sm:col-span-4 xl:col-span-2">
                <select
                  value={user.role ?? "user"}
                  disabled={busy}
                  onChange={(event) => void handleRoleChange(user, event.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 disabled:opacity-60"
                >
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div className="col-span-12 flex flex-wrap gap-2 sm:col-span-4 xl:col-span-2">
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(user.approval_status)}`}>{user.approval_status ?? "unknown"}</span>
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(user.account_status)}`}>{user.account_status ?? "unknown"}</span>
              </div>
              <div className="col-span-6 text-xs text-slate-600 sm:col-span-4 xl:col-span-1">{formatDate(user.last_active_at ?? user.last_login_at ?? user.created_at)}</div>
              <div className="col-span-12 xl:col-span-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(isPending || isRejected) ? (
                    <button type="button" onClick={() => void runAction(user, "Approve user", () => approveAdminUser(currentUser, user.id))} disabled={busy} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400 disabled:opacity-60">Approve</button>
                  ) : null}
                  {isPending ? (
                    <button type="button" onClick={() => setRejectingUserId(rejectingUserId === user.id ? null : user.id)} disabled={busy} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-400 disabled:opacity-60">Reject</button>
                  ) : null}
                  {isDeactivated ? (
                    <button type="button" onClick={() => void runAction(user, "Activate user", () => activateAdminUser(currentUser, user.id))} disabled={busy} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400 disabled:opacity-60">Activate</button>
                  ) : (
                    <button type="button" onClick={() => void runAction(user, "Deactivate user", () => deactivateAdminUser(currentUser, user.id))} disabled={busy} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-60">Deactivate</button>
                  )}
                  <button type="button" onClick={() => void handlePasswordReset(user)} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60">{busy ? "Working…" : "Send reset email"}</button>
                </div>
                {rejectingUserId === user.id ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2">
                    <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Optional rejection reason" className="w-full rounded-lg border border-amber-200 px-2 py-2 text-xs" />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => void handleReject(user)} disabled={busy} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Confirm reject</button>
                      <button type="button" onClick={() => { setRejectingUserId(null); setRejectReason(""); }} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700">Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Password support sends Netlify Identity recovery email. Role, approval, activation, and deactivation actions use protected admin functions.
      </p>
    </div>
  );
}
