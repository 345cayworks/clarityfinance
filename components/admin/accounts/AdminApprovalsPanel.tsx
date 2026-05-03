"use client";

import { useState } from "react";
import type { IdentityUser } from "@/lib/auth/netlify-identity";
import { approveAdminUser, rejectAdminUser } from "@/lib/admin/adminAccountsApi";
import type { AdminUserRow } from "@/lib/types/admin";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function AdminApprovalsPanel({ users, currentUser, onRefresh }: { users: AdminUserRow[]; currentUser: IdentityUser | null; onRefresh?: () => Promise<void> | void }) {
  const pendingUsers = users.filter((user) => user.approval_status === "pending");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function runAction(target: AdminUserRow, label: string, action: () => Promise<{ message?: string } | void>) {
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

  async function confirmReject(target: AdminUserRow) {
    await runAction(target, "Reject user", () => rejectAdminUser(currentUser, target.id, rejectReason));
    setRejectingUserId(null);
    setRejectReason("");
  }

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
      {message ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {pendingUsers.map((user) => {
          const busy = busyUserId === user.id;
          return (
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
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => void runAction(user, "Approve user", () => approveAdminUser(currentUser, user.id))} disabled={busy} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400 disabled:opacity-60">{busy ? "Working…" : "Approve"}</button>
                <button type="button" onClick={() => setRejectingUserId(rejectingUserId === user.id ? null : user.id)} disabled={busy} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-400 disabled:opacity-60">Reject</button>
              </div>
              {rejectingUserId === user.id ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2">
                  <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Optional rejection reason" className="w-full rounded-lg border border-amber-200 px-2 py-2 text-xs" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => void confirmReject(user)} disabled={busy} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Confirm reject</button>
                    <button type="button" onClick={() => { setRejectingUserId(null); setRejectReason(""); }} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700">Cancel</button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
