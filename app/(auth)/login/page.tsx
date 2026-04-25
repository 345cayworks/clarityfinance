import { loginAction } from "@/lib/actions/finance";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-20 max-w-md card">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form action={loginAction} className="mt-4 space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border p-2" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-lg border p-2" />
        <button className="w-full rounded-lg bg-blue-600 p-2 text-white">Login</button>
      </form>
    </div>
  );
}
