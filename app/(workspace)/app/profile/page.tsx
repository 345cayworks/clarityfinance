import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-slate-600">Use onboarding form to edit profile, income, expenses, housing, debt, savings, and goals.</p>
      <Link href="/app/onboarding" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white">Edit profile data</Link>
    </div>
  );
}
