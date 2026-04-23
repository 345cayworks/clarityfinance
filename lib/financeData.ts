import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Debt, FinancialProfile } from "@/types";

export interface UserFinanceData {
  userId: string;
  profile: FinancialProfile | null;
  debts: Debt[];
}

export async function requireUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return { user: data.user, supabase };
}

export async function getUserFinanceData(userId: string): Promise<UserFinanceData> {
  const supabase = createClient();

  const [{ data: profileData }, { data: debtData }] = await Promise.all([
    supabase
      .from("financial_profiles")
      .select("monthly_income,monthly_expenses,savings,credit_score_range,housing_status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("debts").select("id,name,balance,interest_rate,monthly_payment").eq("user_id", userId)
  ]);

  const profile: FinancialProfile | null = profileData
    ? {
        monthlyIncome: Number(profileData.monthly_income),
        monthlyExpenses: Number(profileData.monthly_expenses),
        savings: Number(profileData.savings),
        creditScoreRange: profileData.credit_score_range as FinancialProfile["creditScoreRange"],
        housingStatus: profileData.housing_status as FinancialProfile["housingStatus"]
      }
    : null;

  const debts: Debt[] = (debtData ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    interestRate: Number(row.interest_rate),
    monthlyPayment: Number(row.monthly_payment)
  }));

  return {
    userId,
    profile,
    debts
  };
}
