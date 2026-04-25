"use server";

import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db/prisma";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function loginAction(formData: FormData) {
  await signIn("credentials", {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    mode: "login",
    redirectTo: "/app/dashboard"
  });
}

export async function signupAction(formData: FormData) {
  await signIn("credentials", {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    mode: "signup",
    redirectTo: "/app/onboarding"
  });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function saveOnboardingAction(formData: FormData) {
  const userId = await requireUserId();

  await prisma.profile.upsert({
    where: { userId },
    update: {
      countryOrMarket: String(formData.get("countryOrMarket") ?? ""),
      preferredCurrency: String(formData.get("preferredCurrency") ?? ""),
      ageRange: String(formData.get("ageRange") ?? ""),
      employmentType: String(formData.get("employmentType") ?? ""),
      householdStatus: String(formData.get("householdStatus") ?? ""),
      dependents: Number(formData.get("dependents") ?? 0),
      creditScoreKnown: formData.get("creditScoreKnown") === "on",
      creditScoreOrProfile: String(formData.get("creditScoreOrProfile") ?? "") || null
    },
    create: {
      userId,
      countryOrMarket: String(formData.get("countryOrMarket") ?? ""),
      preferredCurrency: String(formData.get("preferredCurrency") ?? ""),
      ageRange: String(formData.get("ageRange") ?? ""),
      employmentType: String(formData.get("employmentType") ?? ""),
      householdStatus: String(formData.get("householdStatus") ?? ""),
      dependents: Number(formData.get("dependents") ?? 0),
      creditScoreKnown: formData.get("creditScoreKnown") === "on",
      creditScoreOrProfile: String(formData.get("creditScoreOrProfile") ?? "") || null
    }
  });

  await prisma.expenseProfile.upsert({
    where: { userId },
    update: {
      housing: Number(formData.get("expenseHousing") ?? 0),
      utilities: Number(formData.get("expenseUtilities") ?? 0),
      transport: Number(formData.get("expenseTransport") ?? 0),
      groceries: Number(formData.get("expenseGroceries") ?? 0),
      insurance: Number(formData.get("expenseInsurance") ?? 0),
      childcare: Number(formData.get("expenseChildcare") ?? 0),
      discretionary: Number(formData.get("expenseDiscretionary") ?? 0),
      other: Number(formData.get("expenseOther") ?? 0)
    },
    create: {
      userId,
      housing: Number(formData.get("expenseHousing") ?? 0),
      utilities: Number(formData.get("expenseUtilities") ?? 0),
      transport: Number(formData.get("expenseTransport") ?? 0),
      groceries: Number(formData.get("expenseGroceries") ?? 0),
      insurance: Number(formData.get("expenseInsurance") ?? 0),
      childcare: Number(formData.get("expenseChildcare") ?? 0),
      discretionary: Number(formData.get("expenseDiscretionary") ?? 0),
      other: Number(formData.get("expenseOther") ?? 0)
    }
  });

  await prisma.housingProfile.upsert({
    where: { userId },
    update: {
      housingStatus: String(formData.get("housingStatus") ?? ""),
      rentAmount: Number(formData.get("rentAmount") ?? 0),
      mortgageBalance: Number(formData.get("mortgageBalance") ?? 0),
      mortgageRate: Number(formData.get("mortgageRate") ?? 0),
      mortgagePayment: Number(formData.get("mortgagePayment") ?? 0),
      estimatedHomeValue: Number(formData.get("estimatedHomeValue") ?? 0),
      spareRoomAvailable: formData.get("spareRoomAvailable") === "on",
      estimatedRoomRentalIncome: Number(formData.get("estimatedRoomRentalIncome") ?? 0)
    },
    create: {
      userId,
      housingStatus: String(formData.get("housingStatus") ?? ""),
      rentAmount: Number(formData.get("rentAmount") ?? 0),
      mortgageBalance: Number(formData.get("mortgageBalance") ?? 0),
      mortgageRate: Number(formData.get("mortgageRate") ?? 0),
      mortgagePayment: Number(formData.get("mortgagePayment") ?? 0),
      estimatedHomeValue: Number(formData.get("estimatedHomeValue") ?? 0),
      spareRoomAvailable: formData.get("spareRoomAvailable") === "on",
      estimatedRoomRentalIncome: Number(formData.get("estimatedRoomRentalIncome") ?? 0)
    }
  });

  await prisma.savingsProfile.upsert({
    where: { userId },
    update: {
      cashSavings: Number(formData.get("cashSavings") ?? 0),
      emergencyFund: Number(formData.get("emergencyFund") ?? 0),
      investments: Number(formData.get("investments") ?? 0),
      retirementSavings: Number(formData.get("retirementSavings") ?? 0),
      downPaymentSavings: Number(formData.get("downPaymentSavings") ?? 0)
    },
    create: {
      userId,
      cashSavings: Number(formData.get("cashSavings") ?? 0),
      emergencyFund: Number(formData.get("emergencyFund") ?? 0),
      investments: Number(formData.get("investments") ?? 0),
      retirementSavings: Number(formData.get("retirementSavings") ?? 0),
      downPaymentSavings: Number(formData.get("downPaymentSavings") ?? 0)
    }
  });

  await prisma.goal.upsert({
    where: { userId },
    update: {
      targetGoal: String(formData.get("targetGoal") ?? ""),
      targetHomePrice: Number(formData.get("targetHomePrice") ?? 0),
      targetSavingsGoal: Number(formData.get("targetSavingsGoal") ?? 0),
      targetDebtReduction: Number(formData.get("targetDebtReduction") ?? 0),
      targetMonthlyCashFlow: Number(formData.get("targetMonthlyCashFlow") ?? 0),
      goalTimeframe: String(formData.get("goalTimeframe") ?? "")
    },
    create: {
      userId,
      targetGoal: String(formData.get("targetGoal") ?? ""),
      targetHomePrice: Number(formData.get("targetHomePrice") ?? 0),
      targetSavingsGoal: Number(formData.get("targetSavingsGoal") ?? 0),
      targetDebtReduction: Number(formData.get("targetDebtReduction") ?? 0),
      targetMonthlyCashFlow: Number(formData.get("targetMonthlyCashFlow") ?? 0),
      goalTimeframe: String(formData.get("goalTimeframe") ?? "")
    }
  });

  const incomeLabel = String(formData.get("incomeLabel") ?? "Primary Income");
  const incomeAmount = Number(formData.get("incomeMonthlyAmount") ?? 0);
  if (incomeAmount > 0) {
    await prisma.incomeSource.deleteMany({ where: { userId } });
    await prisma.incomeSource.create({
      data: {
        userId,
        type: String(formData.get("incomeType") ?? "salary"),
        label: incomeLabel,
        monthlyAmount: incomeAmount,
        frequency: String(formData.get("incomeFrequency") ?? "monthly"),
        stability: String(formData.get("incomeStability") ?? "stable")
      }
    });
  }

  const debtName = String(formData.get("debtName") ?? "").trim();
  if (debtName) {
    await prisma.debt.deleteMany({ where: { userId } });
    await prisma.debt.create({
      data: {
        userId,
        name: debtName,
        type: String(formData.get("debtType") ?? "other"),
        balance: Number(formData.get("debtBalance") ?? 0),
        interestRate: Number(formData.get("debtInterestRate") ?? 0),
        monthlyPayment: Number(formData.get("debtMonthlyPayment") ?? 0)
      }
    });
  }

  redirect("/app/dashboard");
}

export async function saveScenarioAction(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "Scenario");
  const adjustmentsJson = {
    incomeIncrease: Number(formData.get("incomeIncrease") ?? 0),
    expenseReduction: Number(formData.get("expenseReduction") ?? 0),
    debtPaydown: Number(formData.get("debtPaydown") ?? 0),
    rentalIncome: Number(formData.get("rentalIncome") ?? 0),
    lowerRate: Number(formData.get("lowerRate") ?? 0),
    savingsIncrease: Number(formData.get("savingsIncrease") ?? 0)
  };

  await prisma.scenario.create({ data: { userId, name, adjustmentsJson, resultJson: adjustmentsJson } });
}

export async function generateActionPlanAction() {
  const userId = await requireUserId();
  await prisma.actionPlan.create({
    data: {
      userId,
      name: "Guided Action Plan",
      thirtyDayJson: ["Audit expenses", "Automate savings"],
      ninetyDayJson: ["Reduce one debt APR", "Boost income by 5%"],
      twelveMonthJson: ["Reach emergency fund target", "Increase net cash flow by 20%"]
    }
  });
}

export async function createReportAction() {
  const userId = await requireUserId();
  const profile = await prisma.profile.findUnique({ where: { userId } });
  await prisma.report.create({
    data: {
      userId,
      title: "Clarity Finance Snapshot",
      reportJson: {
        profile,
        generatedAt: new Date().toISOString(),
        note: "PDF export placeholder - coming soon."
      }
    }
  });
}
