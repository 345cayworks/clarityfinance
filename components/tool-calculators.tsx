"use client";

import { useEffect, useMemo, useState } from "react";
import { getIdentityToken } from "@/lib/auth/netlify-identity";
import { debtPayoffEstimates, rentRoomImpact } from "@/lib/calculations/finance";

type Frequency = "Monthly" | "Bi-weekly" | "Weekly";

type ProfilePayload = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
} | null;

const frequencyDivisor: Record<Frequency, number> = {
  Monthly: 12,
  "Bi-weekly": 26,
  Weekly: 52
};

const toSafeNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

export function MortgageTool() {
  const [propertyPrice, setPropertyPrice] = useState(550000);
  const [downPayment, setDownPayment] = useState(90000);
  const [loanAmountInput, setLoanAmountInput] = useState("");
  const [interestRate, setInterestRate] = useState(6.5);
  const [termYears, setTermYears] = useState(30);
  const [paymentFrequency, setPaymentFrequency] = useState<Frequency>("Monthly");
  const [insuranceMonthly, setInsuranceMonthly] = useState(150);
  const [strataMonthly, setStrataMonthly] = useState(0);
  const [otherHousingMonthly, setOtherHousingMonthly] = useState(75);
  const [profileData, setProfileData] = useState<ProfilePayload>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = await getIdentityToken();
      if (!token) return;

      const response = await fetch("/.netlify/functions/profile-get", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) return;
      const payload = (await response.json()) as Exclude<ProfilePayload, null>;
      if (cancelled) return;
      setProfileData(payload);

      const preferredPrice =
        toSafeNumber(payload.goals?.target_home_price) ||
        toSafeNumber(payload.housingProfile?.estimated_home_value);
      const preferredDownPayment = toSafeNumber(payload.savingsProfile?.down_payment_savings);

      if (preferredPrice > 0) setPropertyPrice(preferredPrice);
      if (preferredDownPayment > 0) setDownPayment(preferredDownPayment);
    }

    loadProfile().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const currency = String(profileData?.profile?.preferred_currency ?? "USD") || "USD";
  const monthlyIncome = (profileData?.incomeSources ?? []).reduce((sum, src) => sum + toSafeNumber(src.monthly_amount), 0);
  const monthlyDebtPayments = (profileData?.debts ?? []).reduce((sum, debt) => sum + toSafeNumber(debt.monthly_payment), 0);
  const monthlyExpensesWithoutDebt =
    toSafeNumber(profileData?.expenseProfile?.housing) +
    toSafeNumber(profileData?.expenseProfile?.utilities) +
    toSafeNumber(profileData?.expenseProfile?.transport) +
    toSafeNumber(profileData?.expenseProfile?.groceries) +
    toSafeNumber(profileData?.expenseProfile?.insurance) +
    toSafeNumber(profileData?.expenseProfile?.childcare) +
    toSafeNumber(profileData?.expenseProfile?.discretionary) +
    toSafeNumber(profileData?.expenseProfile?.other);
  const monthlySurplus = monthlyIncome - monthlyExpensesWithoutDebt - monthlyDebtPayments;

  const loanAmount = loanAmountInput.trim() ? Math.max(0, Number(loanAmountInput)) : Math.max(0, propertyPrice - downPayment);

  const calc = useMemo(() => {
    const monthlyRate = interestRate / 100 / 12;
    const months = Math.max(1, Math.round(termYears * 12));

    const monthlyMortgagePayment =
      monthlyRate === 0
        ? loanAmount / months
        : (loanAmount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);

    const selectedFrequencyPayment = (monthlyMortgagePayment * 12) / frequencyDivisor[paymentFrequency];
    const totalMonthlyHousingEstimate = monthlyMortgagePayment + insuranceMonthly + strataMonthly + otherHousingMonthly;
    const downPaymentPct = propertyPrice > 0 ? downPayment / propertyPrice : 0;
    const ltv = propertyPrice > 0 ? loanAmount / propertyPrice : 0;
    const totalRepayment = monthlyMortgagePayment * months;
    const totalInterest = totalRepayment - loanAmount;
    const housingRatio = monthlyIncome > 0 ? totalMonthlyHousingEstimate / monthlyIncome : null;

    return {
      months,
      monthlyMortgagePayment,
      selectedFrequencyPayment,
      totalMonthlyHousingEstimate,
      downPaymentPct,
      ltv,
      totalRepayment,
      totalInterest,
      housingRatio
    };
  }, [loanAmount, interestRate, termYears, paymentFrequency, insuranceMonthly, strataMonthly, otherHousingMonthly, downPayment, propertyPrice, monthlyIncome]);

  const affordabilityLabel =
    calc.housingRatio === null
      ? "Add monthly income in your profile to view affordability guidance."
      : calc.housingRatio < 0.3
        ? "Generally more comfortable"
        : calc.housingRatio <= 0.4
          ? "Review carefully"
          : "May be stretched";

  return (
    <ToolCard
      title="Mortgage Calculator"
      result={`Estimated mortgage payment: ${formatMoney(calc.monthlyMortgagePayment, currency)} / month`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Estimate only</p>
      <p className="text-xs text-slate-500">
        Actual approval depends on lender criteria, income, debt, credit profile, property valuation, and documentation.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Property price" value={propertyPrice} setValue={setPropertyPrice} />
        <Field label="Down payment amount" value={downPayment} setValue={setDownPayment} />
        <TextField label="Loan amount (optional)" value={loanAmountInput} setValue={setLoanAmountInput} placeholder="Auto-calculated if blank" />
        <Field label="Interest rate %" value={interestRate} setValue={setInterestRate} step="0.01" />
        <Field label="Mortgage term (years)" value={termYears} setValue={setTermYears} />
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Payment frequency</span>
          <select
            value={paymentFrequency}
            onChange={(event) => setPaymentFrequency(event.target.value as Frequency)}
            className="w-full rounded-lg border p-2"
          >
            <option>Monthly</option>
            <option>Bi-weekly</option>
            <option>Weekly</option>
          </select>
        </label>
        <Field label="Estimated property insurance monthly" value={insuranceMonthly} setValue={setInsuranceMonthly} />
        <Field label="Estimated strata/maintenance monthly" value={strataMonthly} setValue={setStrataMonthly} />
        <Field label="Estimated other housing costs monthly" value={otherHousingMonthly} setValue={setOtherHousingMonthly} />
      </div>

      <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        <p>Estimated mortgage payment: {formatMoney(calc.monthlyMortgagePayment, currency)} / month</p>
        <p>
          Selected frequency payment ({paymentFrequency}): {formatMoney(calc.selectedFrequencyPayment, currency)}
        </p>
        <p>Loan amount: {formatMoney(loanAmount, currency)}</p>
        <p>Down payment %: {(calc.downPaymentPct * 100).toFixed(1)}%</p>
        <p>Loan-to-value %: {(calc.ltv * 100).toFixed(1)}%</p>
        <p>Total monthly housing estimate: {formatMoney(calc.totalMonthlyHousingEstimate, currency)}</p>
        <p>Total interest over life of loan: {formatMoney(calc.totalInterest, currency)}</p>
        <p>Total repayment over life of loan: {formatMoney(calc.totalRepayment, currency)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        <p className="font-medium text-[#0A2540]">Affordability indicator</p>
        <p>{affordabilityLabel}</p>
        {calc.housingRatio !== null ? <p>Housing ratio: {(calc.housingRatio * 100).toFixed(1)}% of monthly income</p> : null}
        {monthlyIncome > 0 ? <p>Profile monthly income: {formatMoney(monthlyIncome, currency)}</p> : null}
        {profileData ? <p>Current monthly surplus (from profile): {formatMoney(monthlySurplus, currency)}</p> : null}
      </div>

      {calc.housingRatio !== null && calc.housingRatio > 0.4 ? (
        <p className="text-sm text-amber-700">
          Warning: estimated housing payment appears high compared with income. Review debt, down payment, term, and total housing costs.
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        <p className="font-medium text-[#0A2540]">Bank-readiness checklist</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Proof of income</li>
          <li>Bank statements</li>
          <li>Employment letter or business financials</li>
          <li>Existing debt statements</li>
          <li>Credit profile/credit report</li>
          <li>Property valuation or purchase agreement</li>
          <li>Down payment source</li>
          <li>Insurance estimate</li>
        </ul>
      </div>
    </ToolCard>
  );
}

export function RefinanceTool() {
  const [homeValue, setHomeValue] = useState(500000);
  const [currentBalance, setCurrentBalance] = useState(300000);
  const [currentMonthlyPayment, setCurrentMonthlyPayment] = useState(2200);
  const [currentRate, setCurrentRate] = useState(6.75);
  const [newLoanAmount, setNewLoanAmount] = useState(350000);
  const [newRate, setNewRate] = useState(6.15);
  const [termYears, setTermYears] = useState(30);
  const [closingCosts, setClosingCosts] = useState(7000);

  const calc = useMemo(() => {
    const availableEquity = homeValue - currentBalance;
    const cashOutAmount = newLoanAmount - currentBalance;
    const ltv = homeValue > 0 ? newLoanAmount / homeValue : 0;
    const monthlyRate = newRate / 100 / 12;
    const months = termYears * 12;
    const newMonthlyPayment =
      monthlyRate > 0
        ? (newLoanAmount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1)
        : months > 0
          ? newLoanAmount / months
          : 0;
    const paymentDifference = newMonthlyPayment - currentMonthlyPayment;
    const netCashAfterClosingCosts = cashOutAmount - closingCosts;
    return { availableEquity, cashOutAmount, ltv, newMonthlyPayment, paymentDifference, netCashAfterClosingCosts };
  }, [homeValue, currentBalance, currentMonthlyPayment, newLoanAmount, newRate, termYears, closingCosts]);

  return <ToolCard title="Cash-Out Refinance Tool" result={`New payment: $${calc.newMonthlyPayment.toFixed(0)} · Net cash: $${calc.netCashAfterClosingCosts.toFixed(0)}`}>
    <Field label="Current home value" value={homeValue} setValue={setHomeValue} />
    <Field label="Current mortgage balance" value={currentBalance} setValue={setCurrentBalance} />
    <Field label="Current monthly mortgage payment" value={currentMonthlyPayment} setValue={setCurrentMonthlyPayment} />
    <Field label="Current interest rate (%)" value={currentRate} setValue={setCurrentRate} />
    <Field label="New loan amount / proposed mortgage balance" value={newLoanAmount} setValue={setNewLoanAmount} />
    <Field label="Cash out amount (derived)" value={calc.cashOutAmount} setValue={() => undefined} />
    <Field label="New interest rate (%)" value={newRate} setValue={setNewRate} />
    <Field label="New loan term (years)" value={termYears} setValue={setTermYears} />
    <Field label="Closing costs estimate" value={closingCosts} setValue={setClosingCosts} />
    <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
      <p>Available equity: ${calc.availableEquity.toFixed(0)}</p>
      <p>Cash out amount: ${calc.cashOutAmount.toFixed(0)}</p>
      <p>New mortgage balance: ${newLoanAmount.toFixed(0)}</p>
      <p>New estimated monthly payment: ${calc.newMonthlyPayment.toFixed(0)}</p>
      <p>Increase/decrease in payment: ${calc.paymentDifference.toFixed(0)}</p>
      <p>Loan-to-value: {(calc.ltv * 100).toFixed(1)}%</p>
      <p>Net cash after closing costs: ${calc.netCashAfterClosingCosts.toFixed(0)}</p>
    </div>
    {calc.ltv > 0.8 ? <p className="text-sm text-amber-700">High LTV: lender approval may be harder and costs may rise.</p> : null}
    {calc.paymentDifference > currentMonthlyPayment * 0.2 ? <p className="text-sm text-amber-700">Payment impact is significant.</p> : null}
    {calc.netCashAfterClosingCosts <= 0 ? <p className="text-sm text-amber-700">Cash-out amount may not justify costs.</p> : null}
    <p className="text-xs text-slate-500">
      Best uses: high-interest debt payoff, home improvement, investment/property strategy. Avoid using cash-out refinance for lifestyle spending unless repayment plan is clear.
    </p>
  </ToolCard>;
}

export function RentRoomTool() {
  const [cashFlow, setCashFlow] = useState(250);
  const [roomIncome, setRoomIncome] = useState(900);
  const calc = useMemo(() => rentRoomImpact(cashFlow, roomIncome), [cashFlow, roomIncome]);
  return <ToolCard title="Rent-a-Room Tool" result={`New cash flow: $${calc.newCashFlow.toFixed(0)} · Improvement: $${calc.improvement.toFixed(0)}`}>
    <Field label="Current cash flow" value={cashFlow} setValue={setCashFlow} />
    <Field label="Room rental income" value={roomIncome} setValue={setRoomIncome} />
  </ToolCard>;
}

export function DebtPlanTool() {
  const calc = debtPayoffEstimates([
    { name: "Card A", type: "credit", balance: 3200, interestRate: 26, monthlyPayment: 200 },
    { name: "Loan", type: "personal", balance: 8500, interestRate: 12, monthlyPayment: 250 }
  ]);
  return <ToolCard title="Debt Plan Tool" result={`Total debt: $${calc.totalDebt.toFixed(0)} · Estimated payoff: ${calc.estimatedMonths} months`}>
    <p className="text-sm text-slate-600">{calc.snowballNote}</p>
    <p className="text-sm text-slate-600">{calc.avalancheNote}</p>
  </ToolCard>;
}

function ToolCard({ title, result, children }: { title: string; result: string; children: React.ReactNode }) {
  return <div className="card"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-slate-600">{result}</p><div className="mt-4 space-y-2">{children}</div></div>;
}

function Field({ label, value, setValue, step = "1" }: { label: string; value: number; setValue: (v: number) => void; step?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-slate-500">{label}</span><input type="number" step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full rounded-lg border p-2" /></label>;
}

function TextField({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border p-2"
      />
    </label>
  );
}
