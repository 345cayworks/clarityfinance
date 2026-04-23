import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="p-6">
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="text-brandBlue">Sign in</Link></p>
    </div>
  );
}
