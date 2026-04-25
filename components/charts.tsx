"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export function IncomeExpenseChart({ income, expenses }: { income: number; expenses: number }) {
  return (
    <div className="card h-72">
      <h3 className="mb-3 font-semibold">Income vs Expenses</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={[{ name: "Monthly", income, expenses }]}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="income" fill="#14B8A6" />
          <Bar dataKey="expenses" fill="#F59E0B" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DebtBreakdownChart({ totalDebt, monthlyPayment }: { totalDebt: number; monthlyPayment: number }) {
  const data = [
    { name: "Total Debt", value: Math.max(totalDebt, 1) },
    { name: "Monthly Payment", value: Math.max(monthlyPayment, 1) }
  ];

  return (
    <div className="card h-72">
      <h3 className="mb-3 font-semibold">Debt Breakdown</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie data={data} innerRadius={45} outerRadius={90} dataKey="value">
            <Cell fill="#2563EB" />
            <Cell fill="#22C55E" />
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
