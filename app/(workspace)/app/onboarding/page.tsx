"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { type FormEvent, useEffect, useState } from "react";
import { describeAuthError, getIdentityToken, getUser } from "@/lib/auth/netlify-identity";

type OnboardingPayload = Record<string, FormDataEntryValue | boolean>;
type OnboardingField = {
  name: string;
  label: string;
  type?: "number" | "text";
  placeholder?: string;
  options?: readonly string[];
};

type SavedOnboardingData = {
  profile: Record<string, unknown> | null;
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
  goals: Record<string, unknown> | null;
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
  const [savedData, setSavedData] = useState<SavedOnboardingData | null>(null);
  const [formDefaults, setFormDefaults] = useState<Record<string, string | number | boolean>>({});
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const user = await getUser();
        if (!user) return;

        const token = await getIdentityToken(user);
        if (!token) return;

        const response = await fetch("/.netlify/functions/profile-get", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) return;

        const result = (await response.json()) as SavedOnboardingData;
        if (cancelled) return;

        setSavedData(result);
        const primaryIncome = result.incomeSources[0] ?? null;
        const primaryDebt = result.debts[0] ?? null;
        setFormDefaults({
          countryOrMarket: String(result.profile?.country_or_market ?? ""),
          preferredCurrency: String(result.profile?.preferred_currency ?? ""),
          ageRange: String(result.profile?.age_range ?? ""),
          employmentType: String(result.profile?.employment_type ?? ""),
          householdStatus: String(result.profile?.household_status ?? ""),
          dependents: String(result.profile?.dependents ?? ""),
          creditScoreKnown: Boolean(result.profile?.credit_score_known),
          creditScoreOrProfile: String(result.profile?.credit_score_or_profile ?? ""),
          incomeLabel: String(primaryIncome?.label ?? ""),
          incomeType: String(primaryIncome?.type ?? ""),
          incomeMonthlyAmount: String(primaryIncome?.monthly_amount ?? ""),
          incomeFrequency: String(primaryIncome?.frequency ?? ""),
          incomeStability: String(primaryIncome?.stability ?? ""),
          expenseHousing: String(result.expenseProfile?.housing ?? ""),
          expenseUtilities: String(result.expenseProfile?.utilities ?? ""),
          expenseTransport: String(result.expenseProfile?.transport ?? ""),
          expenseGroceries: String(result.expenseProfile?.groceries ?? ""),
          expenseInsurance: String(result.expenseProfile?.insurance ?? ""),
          expenseChildcare: String(result.expenseProfile?.childcare ?? ""),
          expenseDiscretionary: String(result.expenseProfile?.discretionary ?? ""),
          expenseOther: String(result.expenseProfile?.other ?? ""),
          debtName: String(primaryDebt?.name ?? ""),
          debtType: String(primaryDebt?.type ?? ""),
          debtBalance: String(primaryDebt?.balance ?? ""),
          debtInterestRate: String(primaryDebt?.interest_rate ?? ""),
          debtMonthlyPayment: String(primaryDebt?.monthly_payment ?? ""),
          housingStatus: String(result.housingProfile?.housing_status ?? ""),
          rentAmount: String(result.housingProfile?.rent_amount ?? ""),
          mortgageBalance: String(result.housingProfile?.mortgage_balance ?? ""),
          mortgageRate: String(result.housingProfile?.mortgage_rate ?? ""),
          mortgagePayment: String(result.housingProfile?.mortgage_payment ?? ""),
          estimatedHomeValue: String(result.housingProfile?.estimated_home_value ?? ""),
          estimatedRoomRentalIncome: String(result.housingProfile?.estimated_room_rental_income ?? ""),
          spareRoomAvailable: Boolean(result.housingProfile?.spare_room_available),
          cashSavings: String(result.savingsProfile?.cash_savings ?? ""),
          emergencyFund: String(result.savingsProfile?.emergency_fund ?? ""),
          investments: String(result.savingsProfile?.investments ?? ""),
          retirementSavings: String(result.savingsProfile?.retirement_savings ?? ""),
          downPaymentSavings: String(result.savingsProfile?.down_payment_savings ?? ""),
          targetGoal: String(result.goals?.target_goal ?? ""),
          targetHomePrice: String(result.goals?.target_home_price ?? ""),
          targetSavingsGoal: String(result.goals?.target_savings_goal ?? ""),
          targetDebtReduction: String(result.goals?.target_debt_reduction ?? ""),
          targetMonthlyCashFlow: String(result.goals?.target_monthly_cash_flow ?? ""),
          goalTimeframe: String(result.goals?.goal_timeframe ?? "")
        });
        setFormVersion((prev) => prev + 1);
      } catch {
        // Non-blocking: onboarding remains editable even if saved profile fetch fails.
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const getSectionStatus = (title: string): { label: "Complete" | "Needs update" | "Optional"; classes: string } => {
    if (title === "Market & basics") {
      const profile = savedData?.profile;
      const complete = Boolean(profile?.country_or_market && profile?.preferred_currency && profile?.employment_type);
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (title === "Income") {
      const complete = (savedData?.incomeSources.length ?? 0) > 0;
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (title === "Expenses") {
      const complete = Boolean(savedData?.expenseProfile);
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (title === "Debt (optional)") {
      const complete = (savedData?.debts.length ?? 0) > 0;
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Optional", classes: "border-slate-200 bg-slate-50 text-slate-700" };
    }
    if (title === "Housing") {
      const complete = Boolean(savedData?.housingProfile?.housing_status);
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (title === "Savings") {
      const complete = Boolean(savedData?.savingsProfile);
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (title === "Goals") {
      const complete = Boolean(savedData?.goals?.target_goal);
      return complete
        ? { label: "Complete", classes: "border-green-200 bg-green-50 text-green-700" }
        : { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    return { label: "Needs update", classes: "border-amber-200 bg-amber-50 text-amber-700" };
  };

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
        router.replace("/login?callbackUrl=%2Fapp%2Fonboarding" as Route);
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
      const redirectTo = typeof result.redirectTo === "string" && result.redirectTo.startsWith("/app/") ? result.redirectTo : "/app/dashboard";
      router.push(redirectTo as Route);
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
          {sections.map((s, i) => {
            const status = getSectionStatus(s.title);
            return (
            <span key={s.title} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <span className="font-semibold text-[#0A2540]">{i + 1}.</span> {s.title}
              <span className={`ml-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.classes}`}>{status.label}</span>
            </span>
            );
          })}
        </div>
      </div>

      <form key={formVersion} onSubmit={handleSubmit} className="space-y-5">
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
                      defaultValue={String(formDefaults[field.name] ?? "")}
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
                      defaultValue={typeof formDefaults[field.name] === "boolean" ? "" : String(formDefaults[field.name] ?? "")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </label>
              ))}
              {section.title === "Housing" ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    name="spareRoomAvailable"
                    type="checkbox"
                    defaultChecked={Boolean(formDefaults.spareRoomAvailable)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
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
              <input
                name="creditScoreKnown"
                type="checkbox"
                defaultChecked={Boolean(formDefaults.creditScoreKnown)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              I know my credit score / credit profile
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Credit score / profile (optional)</span>
              <input
                name="creditScoreOrProfile"
                placeholder="720 or 'Strong / Fair / Building'"
                defaultValue={typeof formDefaults.creditScoreOrProfile === "boolean" ? "" : String(formDefaults.creditScoreOrProfile ?? "")}
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
