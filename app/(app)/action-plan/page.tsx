import { generateActionPlan } from "@/lib/calculations";
import { Debt, FinancialProfile } from "@/types";

const profile: FinancialProfile = {
  monthlyIncome: 6900,
  monthlyExpenses: 3700,
  savings: 11000,
  creditScoreRange: "580-669",
  housingStatus: "renting"
};

const debts: Debt[] = [{ name: "Card", balance: 7200, interestRate: 19.3, monthlyPayment: 210 }];

export default function ActionPlanPage() {
  const plan = generateActionPlan(profile, debts);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Action Plan</h1>
      <p className="text-slate-600">Step-by-step roadmap based on your current financial profile.</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(plan).map(([window, steps]) => (
          <article key={window} className="card">
            <h2 className="mb-3 text-xl font-semibold text-brandBlue">{window}</h2>
            <ul className="space-y-3">
              {steps.map((step) => (
                <li key={step.title}>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.detail}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
