import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?error=Please%20sign%20in%20to%20continue.");
  }

  if (session.user.role !== "admin") {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-slate-600">You do not have access to the admin workspace.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Admin (Future Ready)</h1>
      <p className="mt-2 text-slate-600">Admin route scaffolded but intentionally minimal for first rebuild.</p>
    </div>
  );
}
