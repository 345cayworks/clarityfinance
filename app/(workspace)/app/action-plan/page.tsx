import { generateActionPlanAction } from "@/lib/actions/finance";

export default function ActionPlanPage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Action Plan</h1>
      <p className="mt-2 text-slate-600">Generate a practical 30-day, 90-day, and 12-month roadmap.</p>
      <form action={generateActionPlanAction} className="mt-4">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Generate action plan</button>
      </form>
    </div>
  );
}
