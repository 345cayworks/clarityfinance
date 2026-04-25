import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        Update your profile, income, expenses, housing, debt, savings and goals from the onboarding wizard.
      </p>
      <Link
        href="/app/onboarding"
        className="mt-4 inline-flex rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160]"
      >
        Edit profile data
      </Link>
    </div>
  );
}
