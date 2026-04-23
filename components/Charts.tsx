"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function IncomeExpenseChart({ income, expenses }: { income: number; expenses: number }) {
  const data = [
    { name: "Income", value: income },
    { name: "Expenses", value: expenses }
  ];

  return (
    <div className="card h-72">
      <h3 className="mb-3 text-base font-semibold">Income vs Expenses</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            <Cell fill="#2563EB" />
            <Cell fill="#14B8A6" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DebtBalanceChart({ data }: { data: { name: string; balance: number }[] }) {
  return (
    <div className="card h-72">
      <h3 className="mb-3 text-base font-semibold">Debt Balances</h3>
      {data.length === 0 ? <p className="text-sm text-slate-500">No debts added yet.</p> : (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={90} />
            <Tooltip />
            <Bar dataKey="balance" fill="#2563EB" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
