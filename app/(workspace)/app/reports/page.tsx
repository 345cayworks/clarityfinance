import { createReportAction } from "@/lib/actions/finance";

export default function ReportsPage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-slate-600">Build a summary report of profile snapshot, scores, goals, and recommended action plan. PDF export is a placeholder.</p>
      <form action={createReportAction} className="mt-4">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Generate basic report</button>
      </form>
    </div>
  );
}
