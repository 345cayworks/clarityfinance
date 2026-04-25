type SendPasswordResetInput = {
  to: string;
  resetLink: string;
};

const hasConfiguredEmailProvider = Boolean(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail({ to, resetLink }: SendPasswordResetInput) {
  if (hasConfiguredEmailProvider) {
    // TODO: Implement actual provider integration (e.g., Resend) using RESEND_API_KEY and EMAIL_FROM.
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[Clarity Finance] Password reset requested for ${to}: ${resetLink}`);
  }
}
