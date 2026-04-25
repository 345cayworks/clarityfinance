"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

function formatAuthError(error: unknown): string {
  if (error instanceof AuthError && error.cause?.err instanceof Error) {
    return error.cause.err.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      mode: "login",
      redirectTo: "/app/dashboard"
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = encodeURIComponent(formatAuthError(error));
    redirect(`/login?error=${message}`);
  }
}

export async function signupAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name) {
    redirect("/signup?error=Please%20enter%20your%20full%20name.");
  }
  if (!email) {
    redirect("/signup?error=Please%20enter%20your%20email.");
  }
  if (password.length < 8) {
    redirect("/signup?error=Password%20must%20be%20at%20least%208%20characters%20long.");
  }
  if (password !== confirmPassword) {
    redirect("/signup?error=Passwords%20do%20not%20match.");
  }

  try {
    await signIn("credentials", {
      name,
      email,
      password,
      mode: "signup",
      redirectTo: "/app/onboarding"
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = encodeURIComponent(formatAuthError(error));
    redirect(`/signup?error=${message}`);
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getBaseUrl(): string {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  throw new Error("Missing APP_URL environment variable for password reset links.");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const successMessage = encodeURIComponent("Check your email");

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const baseUrl = getBaseUrl();
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.deleteMany({
          where: { userId: existingUser.id, usedAt: null }
        });

        await tx.passwordResetToken.create({
          data: {
            userId: existingUser.id,
            tokenHash,
            expiresAt
          }
        });
      });

      try {
        await sendPasswordResetEmail({ to: email, resetLink });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }
  }

  redirect(`/forgot-password?success=${successMessage}`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const encodedToken = encodeURIComponent(token);

  if (!token) {
    redirect("/reset-password?error=Missing%20password%20reset%20token.");
  }

  if (password.length < 8) {
    redirect(`/reset-password?token=${encodedToken}&error=Password%20must%20be%20at%20least%208%20characters%20long.`);
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?token=${encodedToken}&error=Passwords%20do%20not%20match.`);
  }

  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  const now = new Date();

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
    redirect(`/reset-password?token=${encodedToken}&error=This%20reset%20link%20is%20invalid%20or%20has%20expired.`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: hashPassword(password) }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now }
    })
  ]);

  redirect("/login?success=Password%20reset%20successful");
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
