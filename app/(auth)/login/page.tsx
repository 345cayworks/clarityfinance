import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md space-y-4">
        <AuthForm mode="signin" />
        <p className="text-center text-sm text-slate-500">
          New here? <Link className="text-brandBlue" href="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
