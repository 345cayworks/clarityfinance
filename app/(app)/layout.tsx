import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/financeData";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 bg-white p-4 md:p-8">{children}</main>
    </div>
  );
}
