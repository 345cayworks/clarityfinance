"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { describeAuthError, getIdentityToken, getUser } from "@/lib/auth/netlify-identity";

type OnboardingPayload = Record<string, FormDataEntryValue | boolean>;
type OnboardingField = {
  name: string;
  label: string;
  type?: "number" | "text";
  placeholder?: string;
  options?: readonly string[];
};

const sections = [
  {
    title: "Market & basics",
    description: "Where you live and a few quick personal details. Helps us tailor calculators and benchmarks.",
    fields: [
      {
        name: "countryOrMarket",
        label: "Country or market",
        options: ["Cayman Islands", "United States", "Jamaica", "Dominican Republic", "Canada", "United Kingdom", "Other"]
      },
      { name: "preferredCurrency", label: "Preferred currency", options: ["KYD", "USD", "JMD", "DOP", "CAD", "GBP", "Other"] },
      { name: "ageRange", label: "Age range", options: ["Under 25", "25–34", "35–44", "45–54", "55–64", "65+"] },
      {
        name: "employmentType",
        label: "Employment type",
        options: [
          "Full-time employed",
          "Part-time employed",
          "Self-employed",
          "Business owner",
          "Contractor / freelancer",
          "Retired",
          "Student",
          "Unemployed",
          "Other"
        ]
      },
      {
        name: "householdStatus",
        label: "Household status",
        options: ["Single", "Couple", "Family with children", "Single parent", "Multi-generational household", "Shared housing", "Other"]
      },
      { name: "dependents", label: "Dependents", type: "number", placeholder: "0" }
    ]
  },
  {
    title: "Income",
    description: "Add your primary income source. You can add more later.",
    fields: [
      { name: "incomeLabel", label: "Income label", placeholder: "Primary salary" },
      {
        name: "incomeType",
        label: "Income type",
        options: ["Salary", "Hourly wages", "Business income", "Self-employed income", "Rental income", "Pension / retirement", "Investment income", "Other"]
      },
      { name: "incomeMonthlyAmount", label: "Monthly amount", type: "number", placeholder: "5000" },
      {
        name: "incomeFrequency",
        label: "Frequency",
        options: ["Weekly", "Bi-weekly", "Semi-monthly", "Monthly", "Quarterly", "Annually"]
      },
      { name: "incomeStability", label: "Stability", options: ["Stable", "Somewhat stable", "Variable", "Seasonal", "Uncertain"] }
    ]
  },
  {
    title: "Expenses",
    description: "Average monthly outgoings by category. Estimates are fine.",
    fields: [
      { name: "expenseHousing", label: "Housing", type: "number" },
      { name: "expenseUtilities", label: "Utilities", type: "number" },
      { name: "expenseTransport", label: "Transport", type: "number" },
      { name: "expenseGroceries", label: "Groceries", type: "number" },
      { name: "expenseInsurance", label: "Insurance", type: "number" },
      { name: "expenseChildcare", label: "Childcare", type: "number" },
      { name: "expenseDiscretionary", label: "Discretionary", type: "number" },
      { name: "expenseOther", label: "Other", type: "number" }
    ]
  },
  {
    title: "Debt (optional)",
    description: "Your largest debt, if any. We'll add more in the Debt Plan tool.",
    fields: [
      { name: "debtName", label: "Debt name", placeholder: "Card A" },
      {
        name: "debtType",
        label: "Debt type",
        options: ["Credit card", "Personal loan", "Auto loan", "Student loan", "Mortgage", "Medical debt", "Family/friend loan", "Other"]
      },
      { name: "debtBalance", label: "Balance", type: "number" },
      { name: "debtInterestRate", label: "Interest rate %", type: "number" },
      { name: "debtMonthlyPayment", label: "Monthly payment", type: "number" }
    ]
  },
  {
    title: "Housing",
    description: "Renting, owning, or somewhere in between.",
    fields: [
      {
        name: "housingStatus",
        label: "Housing status",
        options: ["Renting", "Own with mortgage", "Own mortgage-free", "Living with family", "Shared housing", "Employer-provided housing", "Other"]
      },
      { name: "rentAmount", label: "Rent amount", type: "number" },
      { name: "mortgageBalance", label: "Mortgage balance", type: "number" },
      { name: "mortgageRate", label: "Mortgage rate %", type: "number" },
      { name: "mortgagePayment", label: "Mortgage payment", type: "number" },
      { name: "estimatedHomeValue", label: "Estimated home value", type: "number" },
      { name: "estimatedRoomRentalIncome", label: "Estimated room rental income", type: "number" }
    ]
  },
  {
    title: "Savings",
    description: "What you've already set aside.",
    fields: [
      { name: "cashSavings", label: "Cash savings", type: "number" },
      { name: "emergencyFund", label: "Emergency fund", type: "number" },
      { name: "investments", label: "Investments", type: "number" },
      { name: "retirementSavings", label: "Retirement savings", type: "number" },
      { name: "downPaymentSavings", label: "Down payment savings", type: "number" }
    ]
  },
  {
    title: "Goals",
    description: "Where you're headed in the next few years.",
    fields: [
      {
        name: "targetGoal",
        label: "Top goal",
        options: [
          "Build emergency fund",
          "Reduce debt",
          "Improve monthly cash flow",
          "Save for home purchase",
          "Prepare for mortgage",
          "Refinance mortgage",
          "Invest more consistently",
          "Rent out a room",
          "Financial stability",
          "Other"
        ]
      },
      { name: "targetHomePrice", label: "Target home price", type: "number" },
      { name: "targetSavingsGoal", label: "Target savings", type: "number" },
      { name: "targetDebtReduction", label: "Target debt reduction", type: "number" },
      { name: "targetMonthlyCashFlow", label: "Target monthly cash flow", type: "number" },
      { name: "goalTimeframe", label: "Timeframe", options: ["30 days", "90 days", "6 months", "12 months", "2 years", "3–5 years"] }
    ]
  }
] satisfies ReadonlyArray<{ title: string; description: string; fields: readonly OnboardingField[] }>;

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload: OnboardingPayload = Object.fromEntries(formData.entries());
    payload.creditScoreKnown = formData.get("creditScoreKnown") === "on";
    payload.spareRoomAvailable = formData.get("spareRoomAvailable") === "on";

    try {
      const user = await getUser();
      if (!user) {
        setSaving(false);
        setError("Your session has expired. Please sign in again.");
        router.replace("/login?callbackUrl=%2Fapp%2Fonboarding");
        return;
      }

      const token = await getIdentityToken(user);
      if (!token) {
        setSaving(false);
        setError("Your session is active, but we could not verify it. Please sign in again.");
        return;
      }

      const response = await fetch("/.netlify/functions/profile-save", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      setSaving(false);
      if (!response.ok) {
        setError(result.error ?? "Failed to save profile.");
        return;
      }
      router.push(result.redirectTo ?? "/app/dashboard");
    } catch (err) {
      setSaving(false);
      setError(describeAuthError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 1</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0A2540]">Build your profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete each section to unlock your Clarity Score, scenarios and guided plan. Optional fields can be left
          blank — you can always come back and refine.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map((s, i) => (
            <span key={s.title} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <span className="font-semibold text-[#0A2540]">{i + 1}.</span> {s.title}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {sections.map((section) => (
          <fieldset key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <legend className="px-1 text-base font-semibold text-[#0A2540]">{section.title}</legend>
            <p className="mt-1 text-sm text-slate-500">{section.description}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.name} className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">{field.label}</span>
                  {field.options ? (
                    <select
                      name={field.name}
                      defaultValue=""
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select...</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={field.name}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </label>
              ))}
              {section.title === "Housing" ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="spareRoomAvailable" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                  Spare room available to rent
                </label>
              ) : null}
            </div>
          </fieldset>
        ))}

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <legend className="px-1 text-base font-semibold text-[#0A2540]">Credit profile</legend>
          <p className="mt-1 text-sm text-slate-500">Optional for non-U.S. users. Lending criteria vary by country.</p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="creditScoreKnown" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              I know my credit score / credit profile
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Credit score / profile (optional)</span>
              <input
                name="creditScoreOrProfile"
                placeholder="720 or 'Strong / Fair / Building'"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </fieldset>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">You can update any section later from your profile.</p>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0A2540] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e3160] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save and continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
