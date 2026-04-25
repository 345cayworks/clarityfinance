import { PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4">
      <PublicHeader />
      <main className="mx-auto max-w-6xl pb-12">{children}</main>
    </div>
  );
}
