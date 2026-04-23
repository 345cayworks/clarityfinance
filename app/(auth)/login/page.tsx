import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="p-8">
      <AuthForm mode="login" />
      <p className="mt-4 text-center text-sm text-slate-600">
        New here? <Link href="/signup" className="text-brandBlue">Create an account</Link>
      </p>
    </div>
  );
}
