"use client";

import { useState } from "react";

export default function AdminNotificationsPage() {
  const [adminEmail, setAdminEmail] = useState(process.env.NEXT_PUBLIC_ADMIN_NOTIFICATION_EMAIL || "");
  const [userApprovalEmails, setUserApprovalEmails] = useState(true);
  const [advisorRequestEmails, setAdvisorRequestEmails] = useState(true);

  return (
    <div className="card space-y-4">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Admin Notifications</h1>
      <p className="text-sm text-slate-600">Configure notification targets. For production, set ADMIN_NOTIFICATION_EMAIL env var.</p>
      <label className="block text-sm">Admin notification email
        <input className="mt-1 w-full rounded border px-3 py-2" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
      </label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={userApprovalEmails} onChange={(e) => setUserApprovalEmails(e.target.checked)} /> Enable user approval emails</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={advisorRequestEmails} onChange={(e) => setAdvisorRequestEmails(e.target.checked)} /> Enable advisor request emails</label>
      <div className="rounded border border-dashed p-3 text-sm text-slate-600">WhatsApp notifications: coming soon (Twilio / Meta WhatsApp Cloud API).</div>
    </div>
  );
}
