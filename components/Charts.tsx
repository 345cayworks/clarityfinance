"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CashFlowPoint {
  month: string;
  cashFlow: number;
}

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <div className="card h-80">
      <h3 className="mb-4 text-lg font-semibold">Cash Flow Trend</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="cashFlow" stroke="#2563EB" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
