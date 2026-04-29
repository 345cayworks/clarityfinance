export async function sendWhatsAppNotification() {
  // Future providers: Twilio, Meta WhatsApp Cloud API.
  if (!process.env.WHATSAPP_PROVIDER) return { ok: false, disabled: true };
  return { ok: false, disabled: true };
}
