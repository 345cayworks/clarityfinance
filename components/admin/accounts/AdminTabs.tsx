export type AdminTabKey = "overview" | "users" | "advisor" | "approvals" | "deactivated" | "invite" | "audit" | "health" | "intelligence";

const tabs: Array<{ key: AdminTabKey; label: string }> = [
  { key: "overview", label: "📊 Overview" },
  { key: "users", label: "👥 Users" },
  { key: "advisor", label: "📥 Advisor Requests" },
  { key: "approvals", label: "🔔 Approvals" },
  { key: "deactivated", label: "🚫 Deactivated" },
  { key: "invite", label: "➕ Invite" },
  { key: "audit", label: "🧾 Audit" },
  { key: "health", label: "🟢 Health" },
  { key: "intelligence", label: "📈 Intelligence" }
];

export function AdminTabs({ tab, onChange }: { tab: AdminTabKey; onChange: (next: AdminTabKey) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-lg border px-3 py-2 text-sm ${
            tab === t.key ? "border-[#1A3A5F] bg-[#F2F7FC] text-[#0A2540]" : "border-slate-300 text-slate-600 hover:border-slate-400"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
