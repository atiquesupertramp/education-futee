"use server";

import { confirmByToken } from "@/lib/onboarding";

export type ConfirmState = { done?: boolean; error?: string } | undefined;

/**
 * Confirms from the public page. Returns a result instead of redirecting, so the
 * parent always sees the thank-you right where they clicked, and any failure
 * shows a clear message with a retry instead of a broken page.
 */
export async function confirmAction(_prev: ConfirmState, fd: FormData): Promise<ConfirmState> {
  try {
    const r = await confirmByToken(String(fd.get("token") ?? ""), "bouton");
    if (!r.ok) return { error: "Ce lien de confirmation n'est plus valide. Écrivez-nous à info@educationfutee.com et nous ferons le suivi." };
    return { done: true };
  } catch (e) {
    console.error("Confirmation failed", e);
    return { error: "Une erreur est survenue de notre côté. Veuillez réessayer dans un instant. Si le problème persiste, écrivez-nous à info@educationfutee.com." };
  }
}
