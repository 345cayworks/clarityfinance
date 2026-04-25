import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Account preferences, security and exports.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Security</h2>
          <p className="mt-2 text-sm text-slate-600">Update your password if you suspect a compromise.</p>
          <Link
            href="/forgot-password"
            className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Send recovery email
          </Link>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#0A2540]">Profile data</h2>
          <p className="mt-2 text-sm text-slate-600">Edit income, expenses, debt, housing, savings and goals.</p>
          <Link
            href="/app/onboarding"
            className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Open onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
