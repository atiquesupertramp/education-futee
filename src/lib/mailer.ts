import "server-only";
import type { Settings } from "./types";

export type SendResult =
  | { status: "simule" }
  | { status: "envoye" | "envoye_test"; providerId: string | null }
  | { status: "echec"; error: string };

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
}

/**
 * Sends one email through Resend, according to settings.email_mode:
 * - simule: nothing leaves the app (default).
 * - test: sent only to settings.test_recipients, subject prefixed with [TEST].
 * - reel: sent to the real recipient.
 * Never throws: a failure is returned so the onboarding flow keeps going.
 */
export async function sendEmail(
  settings: Settings,
  m: { to: string; subject: string; html: string; text: string; idempotencyKey: string },
): Promise<SendResult> {
  if (settings.email_mode === "simule") return { status: "simule" };

  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "echec", error: "RESEND_API_KEY manquante" };

  const isTest = settings.email_mode === "test";
  const to = isTest ? parseRecipients(settings.test_recipients) : [m.to];
  if (to.length === 0) return { status: "echec", error: "Aucune adresse de test configurée" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": m.idempotencyKey,
      },
      body: JSON.stringify({
        from: `Éducation Futée <${settings.sender_email}>`,
        to,
        reply_to: settings.reply_to || undefined,
        subject: isTest ? `[TEST] ${m.subject}` : m.subject,
        html: m.html,
        text: m.text,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { status: "echec", error: `Resend ${res.status}: ${body.message ?? "erreur"}` };
    return { status: isTest ? "envoye_test" : "envoye", providerId: body.id ?? null };
  } catch (e) {
    return { status: "echec", error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}
