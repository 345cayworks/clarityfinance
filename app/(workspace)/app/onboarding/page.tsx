import { saveOnboardingAction } from "@/lib/actions/finance";

export default function OnboardingPage() {
  const sections = ["Market & currency", "Income", "Expenses", "Debt", "Housing", "Savings", "Goals", "Credit Profile"];
  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-semibold">Onboarding Wizard</h1>
        <p className="mt-1 text-sm text-slate-600">Complete each section. Progress: 100% after saving. Optional sections can be skipped.</p>
        <div className="mt-4 flex flex-wrap gap-2">{sections.map((s, i) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{i + 1}. {s}</span>)}</div>
      </div>
      <form action={saveOnboardingAction} className="card grid gap-3 md:grid-cols-2">
        <input name="countryOrMarket" placeholder="Country or market" className="rounded-lg border p-2" />
        <input name="preferredCurrency" placeholder="Preferred currency" className="rounded-lg border p-2" />
        <input name="ageRange" placeholder="Age range" className="rounded-lg border p-2" />
        <input name="employmentType" placeholder="Employment type" className="rounded-lg border p-2" />
        <input name="householdStatus" placeholder="Household status" className="rounded-lg border p-2" />
        <input name="dependents" placeholder="Dependents" type="number" className="rounded-lg border p-2" />
        <input name="incomeLabel" placeholder="Income label" className="rounded-lg border p-2" />
        <input name="incomeType" placeholder="Income type" className="rounded-lg border p-2" />
        <input name="incomeMonthlyAmount" placeholder="Income monthly amount" type="number" className="rounded-lg border p-2" />
        <input name="incomeFrequency" placeholder="Income frequency" className="rounded-lg border p-2" />
        <input name="incomeStability" placeholder="Income stability" className="rounded-lg border p-2" />
        <input name="debtName" placeholder="Debt name (optional)" className="rounded-lg border p-2" />
        <input name="debtType" placeholder="Debt type" className="rounded-lg border p-2" />
        <input name="debtBalance" placeholder="Debt balance" type="number" className="rounded-lg border p-2" />
        <input name="debtInterestRate" placeholder="Debt interest rate" type="number" className="rounded-lg border p-2" />
        <input name="debtMonthlyPayment" placeholder="Debt monthly payment" type="number" className="rounded-lg border p-2" />
        <input name="expenseHousing" placeholder="Housing expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseUtilities" placeholder="Utilities expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseTransport" placeholder="Transport expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseGroceries" placeholder="Groceries expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseInsurance" placeholder="Insurance expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseChildcare" placeholder="Childcare expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseDiscretionary" placeholder="Discretionary expense" type="number" className="rounded-lg border p-2" />
        <input name="expenseOther" placeholder="Other expense" type="number" className="rounded-lg border p-2" />
        <input name="housingStatus" placeholder="Housing status" className="rounded-lg border p-2" />
        <input name="rentAmount" placeholder="Rent amount" type="number" className="rounded-lg border p-2" />
        <input name="mortgageBalance" placeholder="Mortgage balance" type="number" className="rounded-lg border p-2" />
        <input name="mortgageRate" placeholder="Mortgage rate" type="number" className="rounded-lg border p-2" />
        <input name="mortgagePayment" placeholder="Mortgage payment" type="number" className="rounded-lg border p-2" />
        <input name="estimatedHomeValue" placeholder="Estimated home value" type="number" className="rounded-lg border p-2" />
        <input name="estimatedRoomRentalIncome" placeholder="Estimated room rental income" type="number" className="rounded-lg border p-2" />
        <input name="cashSavings" placeholder="Cash savings" type="number" className="rounded-lg border p-2" />
        <input name="emergencyFund" placeholder="Emergency fund" type="number" className="rounded-lg border p-2" />
        <input name="investments" placeholder="Investments" type="number" className="rounded-lg border p-2" />
        <input name="retirementSavings" placeholder="Retirement savings" type="number" className="rounded-lg border p-2" />
        <input name="downPaymentSavings" placeholder="Down payment savings" type="number" className="rounded-lg border p-2" />
        <input name="targetGoal" placeholder="Target goal" className="rounded-lg border p-2" />
        <input name="targetHomePrice" placeholder="Target home price" type="number" className="rounded-lg border p-2" />
        <input name="targetSavingsGoal" placeholder="Target savings goal" type="number" className="rounded-lg border p-2" />
        <input name="targetDebtReduction" placeholder="Target debt reduction" type="number" className="rounded-lg border p-2" />
        <input name="targetMonthlyCashFlow" placeholder="Target monthly cash flow" type="number" className="rounded-lg border p-2" />
        <input name="goalTimeframe" placeholder="Goal timeframe" className="rounded-lg border p-2" />
        <div className="rounded-lg border p-2 text-sm text-slate-600 md:col-span-2">
          <label className="block"><input name="creditScoreKnown" type="checkbox" className="mr-2" />Credit score known</label>
          <input name="creditScoreOrProfile" placeholder="Credit score or profile" className="mt-2 w-full rounded-lg border p-2" />
          <p className="mt-2 text-xs">Optional for non-U.S. users. Lending criteria vary by country.</p>
        </div>
        <button className="rounded-lg bg-blue-600 p-2 text-white md:col-span-2">Save onboarding and continue</button>
      </form>
    </div>
  );
}
