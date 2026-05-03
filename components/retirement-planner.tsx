"use client";

import { useMemo, useState } from "react";

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
          body="Next phase: save this scenario and generate a Retirement Readiness Report alongside your other reports."
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

function ActionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-[#0A2540]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
