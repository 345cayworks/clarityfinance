"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getCurrentUser, initIdentity } from "@/lib/auth/netlify-identity";

type OnboardingPayload = Record<string, FormDataEntryValue | boolean>;

type FieldConfig = {
  name: string;
  placeholder: string;
  type?: "text" | "number" | "select";
  options?: string[];
};

type SectionConfig = {
  title: string;
  fields: FieldConfig[];
};

const sections: SectionConfig[] = [
  {
    title: "Market & currency",
    fields: [
      {
        name: "countryOrMarket",
        placeholder: "Country or market",
        type: "select",
        options: ["Cayman Islands", "United States", "Jamaica", "Dominican Republic", "Canada", "United Kingdom", "Other"]
      },
      {
        name: "preferredCurrency",
        placeholder: "Preferred currency",
        type: "select",
        options: ["KYD", "USD", "JMD", "DOP", "CAD", "GBP", "Other"]
      },
      {
        name: "ageRange",
        placeholder: "Age range",
        type: "select",
        options: ["Under 25", "25–34", "35–44", "45–54", "55–64", "65+"]
      },
      {
        name: "employmentType",
        placeholder: "Employment type",
        type: "select",
        options: ["Full-time employed", "Part-time employed", "Self-employed", "Business owner", "Contractor / freelancer", "Retired", "Student", "Unemployed", "Other"]
      },
      {
        name: "householdStatus",
        placeholder: "Household status",
        type: "select",
        options: ["Single", "Couple", "Family with children", "Single parent", "Multi-generational household", "Shared housing", "Other"]
      },
      { name: "dependents", placeholder: "Dependents", type: "number" }
    ]
  },
  {
    title: "Income",
    fields: [
      { name: "incomeLabel", placeholder: "Income label" },
      {
        name: "incomeType",
        placeholder: "Income type",
        type: "select",
        options: ["Salary", "Hourly wages", "Business income", "Self-employed income", "Rental income", "Pension / retirement", "Investment income", "Other"]
      },
      { name: "incomeMonthlyAmount", placeholder: "Income monthly amount", type: "number" },
      {
        name: "incomeFrequency",
        placeholder: "Income frequency",
        type: "select",
        options: ["Weekly", "Bi-weekly", "Semi-monthly", "Monthly", "Quarterly", "Annually"]
      },
      {
        name: "incomeStability",
        placeholder: "Income stability",
        type: "select",
        options: ["Stable", "Somewhat stable", "Variable", "Seasonal", "Uncertain"]
      }
    ]
  },
  {
    title: "Debt",
    fields: [
      { name: "debtName", placeholder: "Debt name (optional)" },
      {
        name: "debtType",
        placeholder: "Debt type",
        type: "select",
        options: ["Credit card", "Personal loan", "Auto loan", "Student loan", "Mortgage", "Medical debt", "Family/friend loan", "Other"]
      },
      { name: "debtBalance", placeholder: "Debt balance", type: "number" },
      { name: "debtInterestRate", placeholder: "Debt interest rate", type: "number" },
      { name: "debtMonthlyPayment", placeholder: "Debt monthly payment", type: "number" }
    ]
  },
  {
    title: "Expenses",
    fields: [
      { name: "expenseHousing", placeholder: "Housing expense", type: "number" },
      { name: "expenseUtilities", placeholder: "Utilities expense", type: "number" },
      { name: "expenseTransport", placeholder: "Transport expense", type: "number" },
      { name: "expenseGroceries", placeholder: "Groceries expense", type: "number" },
      { name: "expenseInsurance", placeholder: "Insurance expense", type: "number" },
      { name: "expenseChildcare", placeholder: "Childcare expense", type: "number" },
      { name: "expenseDiscretionary", placeholder: "Discretionary expense", type: "number" },
      { name: "expenseOther", placeholder: "Other expense", type: "number" }
    ]
  },
  {
    title: "Housing",
    fields: [
      {
        name: "housingStatus",
        placeholder: "Housing status",
        type: "select",
        options: ["Renting", "Own with mortgage", "Own mortgage-free", "Living with family", "Shared housing", "Employer-provided housing", "Other"]
      },
      { name: "rentAmount", placeholder: "Rent amount", type: "number" },
      { name: "mortgageBalance", placeholder: "Mortgage balance", type: "number" },
      { name: "mortgageRate", placeholder: "Mortgage rate", type: "number" },
      { name: "mortgagePayment", placeholder: "Mortgage payment", type: "number" },
      { name: "estimatedHomeValue", placeholder: "Estimated home value", type: "number" },
      { name: "estimatedRoomRentalIncome", placeholder: "Estimated room rental income", type: "number" }
    ]
  },
  {
    title: "Savings",
    fields: [
      { name: "cashSavings", placeholder: "Cash savings", type: "number" },
      { name: "emergencyFund", placeholder: "Emergency fund", type: "number" },
      { name: "investments", placeholder: "Investments", type: "number" },
      { name: "retirementSavings", placeholder: "Retirement savings", type: "number" },
      { name: "downPaymentSavings", placeholder: "Down payment savings", type: "number" }
    ]
  },
  {
    title: "Goals",
    fields: [
      {
        name: "targetGoal",
        placeholder: "Target goal",
        type: "select",
        options: ["Build emergency fund", "Reduce debt", "Improve monthly cash flow", "Save for home purchase", "Prepare for mortgage", "Refinance mortgage", "Invest more consistently", "Rent out a room", "Financial stability", "Other"]
      },
      { name: "targetHomePrice", placeholder: "Target home price", type: "number" },
      { name: "targetSavingsGoal", placeholder: "Target savings goal", type: "number" },
      { name: "targetDebtReduction", placeholder: "Target debt reduction", type: "number" },
      { name: "targetMonthlyCashFlow", placeholder: "Target monthly cash flow", type: "number" },
      {
        name: "goalTimeframe",
        placeholder: "Goal timeframe",
        type: "select",
        options: ["30 days", "90 days", "6 months", "12 months", "2 years", "3–5 years"]
      }
    ]
  }
];

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

    await initIdentity();
    const user = getCurrentUser();

    if (!user || typeof user.jwt !== "function") {
      setSaving(false);
      setError("Your session is active, but we could not verify it. Please sign in again.");
      return;
    }

    const token = await user.jwt().catch(() => null);

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
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-semibold">Onboarding Wizard</h1>
        <p className="mt-1 text-sm text-slate-600">Complete each section. Progress: 100% after saving. Optional sections can be skipped.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map((section, i) => (
            <span key={section.title} className="rounded-full bg-slate-100 px-3 py-1 text-xs">
              {i + 1}. {section.title}
            </span>
          ))}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{sections.length + 1}. Credit Profile</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card grid gap-3 md:grid-cols-2">
        {sections.flatMap((section) => section.fields).map((field) => {
          if (field.options?.length) {
            return (
              <select key={field.name} name={field.name} className="rounded-lg border p-2 text-slate-700">
                <option value="">Select...</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <input
              key={field.name}
              name={field.name}
              placeholder={field.placeholder}
              type={field.type === "number" ? "number" : "text"}
              className="rounded-lg border p-2"
            />
          );
        })}

        <label className="text-sm text-slate-600">
          <input name="spareRoomAvailable" type="checkbox" className="mr-2" />Spare room available
        </label>
        <div className="rounded-lg border p-2 text-sm text-slate-600 md:col-span-2">
          <label className="block">
            <input name="creditScoreKnown" type="checkbox" className="mr-2" />Credit Score / Credit Profile known
          </label>
          <input name="creditScoreOrProfile" placeholder="Credit Score / Credit Profile" className="mt-2 w-full rounded-lg border p-2" />
          <p className="mt-2 text-xs">Optional for non-U.S. users. Lending criteria vary by country.</p>
        </div>
        <button className="rounded-lg bg-blue-600 p-2 text-white md:col-span-2" disabled={saving}>{saving ? "Saving..." : "Save onboarding and continue"}</button>
        {error ? <p className="md:col-span-2 text-sm text-amber-700">{error}</p> : null}
      </form>
    </div>
  );
}
