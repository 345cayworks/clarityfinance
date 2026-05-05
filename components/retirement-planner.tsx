"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateRetirementIncomeDuration } from "@/lib/calculations/finance";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1
});

function money(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function futureValueLumpSum(principal: number, annualReturn: number, years: number) {
  return principal * (1 + annualReturn) ** years;
}

function futureValueMonthlyContribution(monthlyContribution: number, annualReturn: number, years: number) {
  const months = Math.max(0, Math.round(years * 12));
  if (months === 0) return 0;
  const monthlyRate = annualReturn / 12;
  if (monthlyRate === 0) return monthlyContribution * months;
  return monthlyContribution * (((1 + monthlyRate) ** months - 1) / monthlyRate);
}

function requiredMonthlyContribution(targetAmount: number, currentSavings: number, annualReturn: number, years: number) {
  const months = Math.max(0, Math.round(years * 12));
  if (months === 0) return 0;
  const futureCurrentSavings = futureValueLumpSum(currentSavings, annualReturn, years);
  const gap = targetAmount - futureCurrentSavings;
  if (gap <= 0) return 0;
  const monthlyRate = annualReturn / 12;
  if (monthlyRate === 0) return gap / months;
  return gap / (((1 + monthlyRate) ** months - 1) / monthlyRate);
}

function readinessLabel(fundingRatio: number) {
  if (fundingRatio >= 1) return "On track based on these assumptions";
  if (fundingRatio >= 0.75) return "Close, but needs attention";
  if (fundingRatio >= 0.5) return "Needs a stronger savings plan";
  return "Significant retirement gap";
}

function retirementScore(fundingRatio: number, yearsToRetirement: number, savingsRate: number) {
  const fundingScore = clamp(fundingRatio, 0, 1.25) * 60;
  const timeScore = clamp(yearsToRetirement / 30, 0, 1) * 20;
  const savingsScore = clamp(savingsRate / 0.15, 0, 1) * 20;
  return Math.round(clamp(fundingScore + timeScore + savingsScore, 0, 100));
}

export default function RetirementPlanner() {
  const [currentAge, setCurrentAge] = useState(42);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentSavings, setCurrentSavings] = useState(45000);
  const [monthlyContribution, setMonthlyContribution] = useState(650);
  const [employerMonthlyContribution, setEmployerMonthlyContribution] = useState(250);
  const [currentMonthlyIncome, setCurrentMonthlyIncome] = useState(6200);
  const [targetMonthlyRetirementIncome, setTargetMonthlyRetirementIncome] = useState(4500);
  const [otherMonthlyRetirementIncome, setOtherMonthlyRetirementIncome] = useState(800);
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState(6);
  const [inflationRate, setInflationRate] = useState(3);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [retirementBalanceToTest, setRetirementBalanceToTest] = useState(0);
  const [plannedMonthlyRetirementIncome, setPlannedMonthlyRetirementIncome] = useState(0);
  const [durationInflationRate, setDurationInflationRate] = useState(3);
  const [retirementGrowthRate, setRetirementGrowthRate] = useState(4);
  const [showFullDurationProjection, setShowFullDurationProjection] = useState(false);

  const result = useMemo(() => {
    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    const annualReturn = expectedAnnualReturn / 100;
    const inflation = inflationRate / 100;
    const safeWithdrawal = Math.max(0.01, withdrawalRate / 100);
    const totalMonthlyContribution = monthlyContribution + employerMonthlyContribution;
    const projectedSavings =
      futureValueLumpSum(currentSavings, annualReturn, yearsToRetirement) +
      futureValueMonthlyContribution(totalMonthlyContribution, annualReturn, yearsToRetirement);
    const inflationAdjustedTargetIncome = targetMonthlyRetirementIncome * (1 + inflation) ** yearsToRetirement;
    const monthlyGapAfterOtherIncome = Math.max(0, inflationAdjustedTargetIncome - otherMonthlyRetirementIncome);
    const targetNestEgg = (monthlyGapAfterOtherIncome * 12) / safeWithdrawal;
    const fundingRatio = targetNestEgg > 0 ? projectedSavings / targetNestEgg : 1;
    const projectedAnnualWithdrawal = projectedSavings * safeWithdrawal;
    const projectedMonthlyWithdrawal = projectedAnnualWithdrawal / 12;
    const projectedTotalMonthlyRetirementIncome = projectedMonthlyWithdrawal + otherMonthlyRetirementIncome;
    const monthlyShortfall = Math.max(0, inflationAdjustedTargetIncome - projectedTotalMonthlyRetirementIncome);
    const monthlySurplus = Math.max(0, projectedTotalMonthlyRetirementIncome - inflationAdjustedTargetIncome);
    const requiredContribution = requiredMonthlyContribution(targetNestEgg, currentSavings, annualReturn, yearsToRetirement);
    const additionalRequiredMonthlySavings = Math.max(0, requiredContribution - totalMonthlyContribution);
    const savingsRate = currentMonthlyIncome > 0 ? totalMonthlyContribution / currentMonthlyIncome : 0;
    const score = retirementScore(fundingRatio, yearsToRetirement, savingsRate);

    return {
      yearsToRetirement,
      totalMonthlyContribution,
      projectedSavings,
      inflationAdjustedTargetIncome,
      monthlyGapAfterOtherIncome,
      targetNestEgg,
      fundingRatio,
      projectedMonthlyWithdrawal,
      projectedTotalMonthlyRetirementIncome,
      monthlyShortfall,
      monthlySurplus,
      additionalRequiredMonthlySavings,
      savingsRate,
      score,
      label: readinessLabel(fundingRatio)
    };
  }, [
    currentAge,
    retirementAge,
    currentSavings,
    monthlyContribution,
    employerMonthlyContribution,
    currentMonthlyIncome,
    targetMonthlyRetirementIncome,
    otherMonthlyRetirementIncome,
    expectedAnnualReturn,
    inflationRate,
    withdrawalRate
  ]);

  const incomeDurationInputs = useMemo(() => {
    const startingBalance = retirementBalanceToTest > 0 ? retirementBalanceToTest : result.projectedSavings;
    const monthlyWithdrawal = plannedMonthlyRetirementIncome > 0 ? plannedMonthlyRetirementIncome : result.monthlyGapAfterOtherIncome;
    return { startingBalance, monthlyWithdrawal };
  }, [plannedMonthlyRetirementIncome, result.monthlyGapAfterOtherIncome, result.projectedSavings, retirementBalanceToTest]);

  const incomeDuration = useMemo(
    () =>
      calculateRetirementIncomeDuration({
        startingBalance: incomeDurationInputs.startingBalance,
        monthlyWithdrawal: incomeDurationInputs.monthlyWithdrawal,
        inflationRatePercent: durationInflationRate,
        annualGrowthRatePercent: retirementGrowthRate
      }),
    [durationInflationRate, incomeDurationInputs.monthlyWithdrawal, incomeDurationInputs.startingBalance, retirementGrowthRate]
  );

  const noGrowthDuration = useMemo(
    () =>
      calculateRetirementIncomeDuration({
        startingBalance: incomeDurationInputs.startingBalance,
        monthlyWithdrawal: incomeDurationInputs.monthlyWithdrawal,
        inflationRatePercent: durationInflationRate,
        annualGrowthRatePercent: 0
      }),
    [durationInflationRate, incomeDurationInputs.monthlyWithdrawal, incomeDurationInputs.startingBalance]
  );

  const durationRows = showFullDurationProjection ? incomeDuration.projectionRows : incomeDuration.projectionRows.slice(0, 10);
  const canShowDuration = incomeDurationInputs.startingBalance > 0 && incomeDurationInputs.monthlyWithdrawal > 0 && durationInflationRate >= 0 && retirementGrowthRate >= 0;

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Scenario tool</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A2540]">Retirement Readiness Planner</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Model whether your current savings, monthly contributions, expected growth, and other retirement income could support your target retirement income.
              This is an educational estimate, not financial advice.
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Readiness score</p>
            <p className="text-3xl font-semibold text-[#0A2540]">{result.score}</p>
            <p className="text-xs text-slate-600">{result.label}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr,0.9fr]">
        <div className="card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Planner inputs</h2>
            <p className="text-sm text-slate-600">Adjust the assumptions to compare different retirement scenarios.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Current age" value={currentAge} setValue={setCurrentAge} />
            <Field label="Target retirement age" value={retirementAge} setValue={setRetirementAge} />
            <Field label="Current retirement savings" value={currentSavings} setValue={setCurrentSavings} />
            <Field label="Your monthly contribution" value={monthlyContribution} setValue={setMonthlyContribution} />
            <Field label="Employer / pension monthly contribution" value={employerMonthlyContribution} setValue={setEmployerMonthlyContribution} />
            <Field label="Current monthly income" value={currentMonthlyIncome} setValue={setCurrentMonthlyIncome} />
            <Field label="Target monthly retirement income" value={targetMonthlyRetirementIncome} setValue={setTargetMonthlyRetirementIncome} />
            <Field label="Other expected monthly retirement income" value={otherMonthlyRetirementIncome} setValue={setOtherMonthlyRetirementIncome} />
            <Field label="Expected annual return %" value={expectedAnnualReturn} setValue={setExpectedAnnualReturn} step="0.1" />
            <Field label="Inflation estimate %" value={inflationRate} setValue={setInflationRate} step="0.1" />
            <Field label="Withdrawal rate %" value={withdrawalRate} setValue={setWithdrawalRate} step="0.1" />
          </div>
        </div>

        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Projected outcome</h2>
            <Metric label="Years to retirement" value={`${result.yearsToRetirement}`} />
            <Metric label="Projected retirement savings" value={money(result.projectedSavings)} />
            <Metric label="Target nest egg estimate" value={money(result.targetNestEgg)} />
            <Metric label="Funding ratio" value={percentFormatter.format(result.fundingRatio)} />
            <Metric label="Estimated monthly retirement income" value={money(result.projectedTotalMonthlyRetirementIncome)} />
            <Metric label="Inflation-adjusted income target" value={money(result.inflationAdjustedTargetIncome)} />
          </section>

          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Gap analysis</h2>
            {result.monthlyShortfall > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Estimated monthly shortfall: <strong>{money(result.monthlyShortfall)}</strong>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Estimated monthly surplus: <strong>{money(result.monthlySurplus)}</strong>
              </div>
            )}
            <Metric label="Current monthly retirement savings" value={money(result.totalMonthlyContribution)} />
            <Metric label="Estimated extra monthly savings needed" value={money(result.additionalRequiredMonthlySavings)} />
            <Metric label="Current retirement savings rate" value={percentFormatter.format(result.savingsRate)} />
          </section>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Retirement Income Duration</p>
          <h2 className="mt-1 text-lg font-semibold text-[#0A2540]">How Long Could This Last?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Estimate how long your retirement balance may last when withdrawals increase each year for inflation.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Retirement balance to test"
            value={Math.round(incomeDurationInputs.startingBalance)}
            setValue={setRetirementBalanceToTest}
          />
          <Field
            label="Planned monthly retirement income"
            value={Math.round(incomeDurationInputs.monthlyWithdrawal)}
            setValue={setPlannedMonthlyRetirementIncome}
          />
          <Field label="Annual inflation adjustment" value={durationInflationRate} setValue={setDurationInflationRate} step="0.1" />
          <Field label="Expected annual growth during retirement" value={retirementGrowthRate} setValue={setRetirementGrowthRate} step="0.1" />
        </div>

        {!canShowDuration ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Enter a retirement balance and planned monthly retirement income greater than zero to estimate duration.
          </div>
        ) : (
          <>
            {incomeDuration.warnings.length > 0 ? (
              <div className="space-y-2">
                {incomeDuration.warnings.map((warning) => (
                  <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <DurationCard
                title="How Long Could This Last?"
                value={incomeDuration.growthAdjustedDurationLabel}
                note="Based on your retirement balance, planned monthly withdrawal, inflation adjustment, and expected growth rate."
              />
              <DurationCard
                title="No-Growth Estimate"
                value={noGrowthDuration.growthAdjustedDurationLabel}
                note="Conservative estimate assuming the balance earns no additional growth."
              />
              <DurationCard title="First-Year Withdrawal" value={money(incomeDuration.firstYearWithdrawal)} />
              <DurationCard title="Inflation-Adjusted Final-Year Withdrawal" value={money(incomeDuration.finalYearWithdrawal)} />
              <DurationCard title="Total Estimated Withdrawn" value={money(incomeDuration.totalWithdrawn)} />
            </div>

            <div className="h-72 rounded-xl border border-slate-200 bg-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeDuration.projectionRows} margin={{ top: 10, right: 18, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="year" tickFormatter={(value) => `Year ${value}`} />
                  <YAxis tickFormatter={(value) => money(Number(value)).replace(".00", "")} />
                  <Tooltip formatter={(value) => money(Number(value))} labelFormatter={(value) => `Year ${value}`} />
                  <Line type="monotone" dataKey="endingBalance" name="Retirement balance" stroke="#2563EB" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="withdrawalAmount" name="Annual withdrawal amount" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#0A2540]">Inflation-Adjusted Drawdown Projection</h3>
                {incomeDuration.projectionRows.length > 10 ? (
                  <button
                    type="button"
                    onClick={() => setShowFullDurationProjection((current) => !current)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400"
                  >
                    {showFullDurationProjection ? "Show first 10 years" : "Show full projection"}
                  </button>
                ) : null}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Year</th>
                      <th className="py-2 pr-3">Starting Balance</th>
                      <th className="py-2 pr-3">Growth Earned</th>
                      <th className="py-2 pr-3">Withdrawal</th>
                      <th className="py-2 pr-3">Ending Balance</th>
                      <th className="py-2 pr-3">Cumulative Withdrawn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {durationRows.map((row) => (
                      <tr key={row.year}>
                        <td className="py-2 pr-3 font-medium text-[#0A2540]">{row.year}</td>
                        <td className="py-2 pr-3">{money(row.startingBalance)}</td>
                        <td className="py-2 pr-3">{money(row.growthAmount)}</td>
                        <td className="py-2 pr-3">{money(row.withdrawalAmount)}</td>
                        <td className="py-2 pr-3">{money(row.endingBalance)}</td>
                        <td className="py-2 pr-3">{money(row.cumulativeWithdrawn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Income duration is estimated by reducing the retirement balance each year by the planned withdrawal amount. The withdrawal amount is increased annually for inflation. If an investment growth rate is entered, the remaining balance is assumed to grow once per year before the annual withdrawal is deducted. Taxes, fees, market volatility, emergency withdrawals, pension income, rental income, and changes in spending are not included.
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Scenario to test"
          body="Increase monthly savings, delay retirement by two years, reduce the income target, or add expected rental income."
        />
        <ActionCard
          title="Advisor conversation"
          body="Use this planner to prepare questions about savings rate, investment assumptions, pension income, debt, and housing."
        />
        <ActionCard
          title="Future report output"
          body="TODO: include retirement income duration in saved retirement reports once retirement report persistence is connected."
        />
      </section>
    </div>
  );
}

function Field({ label, value, setValue, step = "1" }: { label: string; value: number; setValue: (value: number) => void; step?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-[#0A2540]">{value}</span>
    </div>
  );
}

function DurationCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-[#0A2540]">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

function ActionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-[#0A2540]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
