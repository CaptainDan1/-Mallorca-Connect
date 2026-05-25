// Schmaler Resend-Wrapper ueber `fetch`, damit wir keine zusaetzliche
// npm-Abhaengigkeit brauchen. Wird ausschliesslich serverseitig in
// API-Routen verwendet -- niemals im Browser.

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

export function isEmailNotificationConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.ADMIN_NOTIFY_EMAIL &&
      process.env.NOTIFICATION_FROM_EMAIL,
  );
}

export async function sendAdminEmail({
  subject,
  text,
  html,
}: Omit<SendEmailParams, "to">): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const from = process.env.NOTIFICATION_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return {
      ok: false,
      skipped: true,
      reason:
        "RESEND_API_KEY, ADMIN_NOTIFY_EMAIL oder NOTIFICATION_FROM_EMAIL fehlt.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: html ?? `<pre>${escapeHtml(text)}</pre>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Resend antwortete mit ${response.status}: ${body}`,
      };
    }
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Resend-Fehler unbekannt";
    return { ok: false, error: message };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
