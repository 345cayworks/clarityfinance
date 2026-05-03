"use client";

import { useMemo } from "react";
import { toCurrency } from "@/lib/finance/calculations";

type FormValue = string | boolean;
type FormState = Record<string, FormValue>;

type IncomeCardProps = {
  title: string;
  description?: string;
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  error?: string;
};

const incomeSlots = [1, 2, 3] as const;

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fieldName(slot: number, key: "type" | "label" | "monthlyAmount" | "frequency" | "stability") {
  return `incomeSource${slot}${key[0].toUpperCase()}${key.slice(1)}`;
}

export default function IncomeCard({ title, description, formData, setFormData, error }: IncomeCardProps) {
  const totalIncome = useMemo(
    () => incomeSlots.reduce((sum, slot) => sum + numberValue(formData[fieldName(slot, "monthlyAmount")]), 0),
    [formData]
  );

  const update = (name: string, value: string) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0A2540]">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Monthly Income</p>
          <p className="mt-1 text-2xl font-semibold text-[#0A2540]">{toCurrency(totalIncome)}</p>
          <p className="mt-1 text-xs text-slate-600">Calculated from up to 3 income sources.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {incomeSlots.map((slot) => {
          const prefix = `incomeSource${slot}`;
          return (
            <div key={slot} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-[#0A2540]">Income Source {slot}</h3>
                {slot === 1 ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Primary</span> : null}
              </div>

              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Income type</span>
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                    value={String(formData[`${prefix}Type`] ?? "")}
                    onChange={(event) => update(`${prefix}Type`, event.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="salary">Salary / wages</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="business">Business income</option>
                    <option value="rental">Rental income</option>
                    <option value="pension">Pension / retirement</option>
                    <option value="side_income">Side income</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Label / description</span>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={String(formData[`${prefix}Label`] ?? "")}
                    placeholder={slot === 1 ? "Main job" : "Rental, side work, pension..."}
                    onChange={(event) => update(`${prefix}Label`, event.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Monthly amount</span>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={String(formData[`${prefix}MonthlyAmount`] ?? "")}
                    placeholder="0.00"
                    onChange={(event) => update(`${prefix}MonthlyAmount`, event.target.value)}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Frequency</span>
                    <select
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                      value={String(formData[`${prefix}Frequency`] ?? "monthly")}
                      onChange={(event) => update(`${prefix}Frequency`, event.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="annual">Annual</option>
                      <option value="irregular">Irregular</option>
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Stability</span>
                    <select
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                      value={String(formData[`${prefix}Stability`] ?? "stable")}
                      onChange={(event) => update(`${prefix}Stability`, event.target.value)}
                    >
                      <option value="stable">Stable</option>
                      <option value="variable">Variable</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="temporary">Temporary</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-[#0A2540]">Income summary</p>
        <p className="mt-1 text-sm text-slate-600">
          Your total income for reports, loan readiness, and cash-flow calculations is currently <strong>{toCurrency(totalIncome)}</strong> per month.
        </p>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
