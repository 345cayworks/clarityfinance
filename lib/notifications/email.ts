export async function sendEmailNotification({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, error: "Email not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, html, text: text ?? html.replace(/<[^>]+>/g, "") }) });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (error) {
    console.error("sendEmailNotification failed", error instanceof Error ? error.message : error);
    return { ok: false, error: "Email send failed" };
  }
}
