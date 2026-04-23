"use client";

import { clarityScore, monthlyCashFlow } from "@/lib/calculations";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function RentRoomPage() {
  const { data, update } = useFinanceData();
  const baseCash = monthlyCashFlow({ ...data, estimatedRoomRentalIncome: 0 });
  const newCash = monthlyCashFlow(data);
  const baseScore = clarityScore({ ...data, estimatedRoomRentalIncome: 0 });
  const newScore = clarityScore(data);

  return (
    <div className="space-y-4">
      <div className="card md:max-w-md">
        <label className="label">Estimated room rental income</label>
        <input className="input" type="number" value={data.estimatedRoomRentalIncome} onChange={(e) => update("estimatedRoomRentalIncome", Number(e.target.value))} />
      </div>
      <div className="card">
        <p>Cash flow before: <strong>${baseCash.toFixed(0)}</strong></p>
        <p>Cash flow after: <strong>${newCash.toFixed(0)}</strong></p>
        <p>Stability/Clarity score improvement: <strong>{newScore - baseScore >= 0 ? "+" : ""}{newScore - baseScore}</strong></p>
      </div>
      <p className="text-sm text-slate-500">Assumptions used: rental income is treated as recurring gross monthly income and does not include vacancy or extra utility costs.</p>
    </div>
  );
}
