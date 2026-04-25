import { Resend } from "resend";

type SendPasswordResetInput = {
  to: string;
  resetLink: string;
};

export async function sendPasswordResetEmail({ to, resetLink }: SendPasswordResetInput) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!resendApiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Clarity Finance] Password reset requested for ${to}: ${resetLink}`);
      return;
    }

    throw new Error("Missing RESEND_API_KEY in production. Password reset email delivery is not configured.");
  }

  if (!emailFrom) {
    throw new Error("Missing EMAIL_FROM environment variable. Password reset email delivery requires a sender address.");
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: emailFrom,
    to,
    subject: "Reset your Clarity Finance password",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0A2540;">
        <h2 style="margin:0 0 12px;">Clarity Finance</h2>
        <p style="margin:0 0 8px;">Know where you stand. Know what&apos;s next.</p>
        <p style="margin:16px 0;">We received a request to reset your password.</p>
        <p style="margin:16px 0;">
          <a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
            Reset password
          </a>
        </p>
        <p style="margin:16px 0;">This link expires in 1 hour.</p>
        <p style="margin:16px 0;">If you did not request this, you can ignore this email.</p>
      </div>
    `
  });
}
