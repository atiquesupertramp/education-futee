"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db, must } from "@/lib/db";
import {
  checkPayment,
  advanceClock,
  confirmByToken,
  createStudent,
  markCallDone,
  processDue,
  resendWelcome,
  resetDemo,
} from "@/lib/onboarding";
import { parseGroupCode } from "@/lib/labels";
import { TEMPLATES, defaultBody, isTemplateKey } from "@/lib/email-defaults";
import { validateTemplate } from "@/lib/email-engine";
import { sampleEmail } from "@/lib/emails";
import type { PaymentType } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Reads the payment fields of a form. Accepts "49,99" and "49.99". */
function readPayment(fd: FormData): { type: PaymentType | null; amount: number | null } {
  const rawType = str(fd, "payment_type");
  const type = rawType === "mensuel" || rawType === "unique" ? rawType : null;
  const raw = str(fd, "payment_amount").replace(/\s|\$/g, "").replace(",", ".");
  const amount = raw === "" ? null : Number(raw);
  return { type, amount: amount != null && Number.isNaN(amount) ? NaN : amount };
}

export type FormState = { error?: string } | undefined;

export async function createStudentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  let id: string;
  try {
    const cycle = Number(fd.get("cycle"));
    if (cycle !== 2 && cycle !== 3) return { error: "Choisissez le cycle." };
    const pay = readPayment(fd);
    id = await createStudent({
      payment_type: pay.type,
      payment_amount: pay.amount,
      parent_name: str(fd, "parent_name"),
      parent_email: str(fd, "parent_email"),
      parent_phone: str(fd, "parent_phone"),
      first_name: str(fd, "first_name"),
      grade: str(fd, "grade"),
      cycle,
      start_date: str(fd, "start_date"),
      end_date: str(fd, "end_date"),
      closer_name: str(fd, "closer_name"),
      group_codes: fd.getAll("group_codes").map(String),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
  revalidatePath("/", "layout");
  redirect(`/eleves/${id}?nouveau=1`);
}

export async function advanceClockAction(fd: FormData) {
  await requireAuth();
  const hours = Number(fd.get("hours") ?? 24);
  await advanceClock(Number.isFinite(hours) && hours > 0 ? hours : 24);
  revalidatePath("/", "layout");
}

export async function runFollowupsAction() {
  await requireAuth();
  await processDue();
  revalidatePath("/", "layout");
}

export async function confirmManualAction(fd: FormData) {
  await requireAuth();
  await confirmByToken(str(fd, "token"), str(fd, "via") === "reponse" ? "reponse" : "manuel");
  revalidatePath("/", "layout");
}

export async function resendWelcomeAction(fd: FormData) {
  await requireAuth();
  await resendWelcome(str(fd, "enrollment_id"));
  revalidatePath("/", "layout");
}

export async function callDoneAction(fd: FormData) {
  await requireAuth();
  await markCallDone(str(fd, "student_id"), str(fd, "notes"));
  revalidatePath("/", "layout");
}

export async function updateMembershipAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "student_id");
  const status = str(fd, "membership_status");
  must(
    await db()
      .from("students")
      .update({
        membership_status: ["actif", "en_pause", "termine"].includes(status) ? status : "actif",
        start_date: str(fd, "start_date") || null,
        end_date: str(fd, "end_date") || null,
        notes: str(fd, "notes") || null,
      })
      .eq("id", id),
    "Mise à jour de l'abonnement",
  );
  await db().from("events").insert({ student_id: id, type: "abonnement", detail: `Abonnement mis à jour : ${status}` });
  revalidatePath("/", "layout");
}

export type PaymentState = { error?: string; saved?: boolean } | undefined;

export async function updatePaymentAction(_prev: PaymentState, fd: FormData): Promise<PaymentState> {
  await requireAuth();
  const id = str(fd, "student_id");
  const pay = readPayment(fd);
  const err = checkPayment(pay.type, pay.amount);
  if (err) return { error: err };
  const res = await db()
    .from("students")
    .update({ payment_type: pay.type, payment_amount: pay.type ? Math.round((pay.amount ?? 0) * 100) / 100 : null })
    .eq("id", id);
  if (res.error) return { error: "Enregistrement impossible : " + res.error.message };
  await db().from("events").insert({ student_id: id, type: "paiement", detail: pay.type ? `Paiement enregistré : ${pay.amount} $ (${pay.type === "mensuel" ? "mensuel" : "unique"})` : "Paiement retiré" });
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function deleteStudentAction(fd: FormData) {
  await requireAuth();
  must(await db().from("students").delete().eq("id", str(fd, "student_id")), "Suppression");
  revalidatePath("/", "layout");
  redirect("/eleves");
}

export async function saveGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const original = str(fd, "original_code");
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  const parsed = parseGroupCode(code);
  if (!parsed) return { error: "Code invalide. Format attendu : 2-L-01, 3-M-02, 2CF-E-01, 3CF-L-03…" };
  const row = {
    code,
    program: parsed.program,
    cycle: parsed.cycle,
    subject: parsed.subject,
    teacher: str(fd, "teacher") || null,
    day: str(fd, "day") || null,
    time: str(fd, "time") || null,
    zoom_url: str(fd, "zoom_url") || null,
    zoom_id: str(fd, "zoom_id") || null,
    zoom_password: str(fd, "zoom_password") || null,
    active: fd.get("active") === "on",
    notes: str(fd, "notes") || null,
    updated_at: new Date().toISOString(),
  };
  const res = original
    ? await db().from("groups").update(row).eq("code", original)
    : await db().from("groups").insert(row);
  if (res.error) {
    return { error: res.error.code === "23505" ? `Le groupe ${code} existe déjà.` : res.error.message };
  }
  revalidatePath("/", "layout");
  redirect("/groupes");
}

export async function saveSettingsAction(fd: FormData) {
  await requireAuth();
  must(
    await db()
      .from("settings")
      .update({ sender_email: str(fd, "sender_email"), reply_to: str(fd, "reply_to"), va_email: str(fd, "va_email"), sms_enabled: fd.get("sms_enabled") === "on", email_mode: ["simule", "test", "reel"].includes(str(fd, "email_mode")) ? str(fd, "email_mode") : "simule", test_recipients: str(fd, "test_recipients") })
      .eq("id", 1),
    "Paramètres",
  );
  revalidatePath("/", "layout");
}

export async function resetDemoAction() {
  await requireAuth();
  await resetDemo();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ------------------------------------------------------------------ */
/* Email templates                                                     */
/* ------------------------------------------------------------------ */

export type TemplateState = { error?: string; saved?: boolean; previewHtml?: string; previewSubject?: string; subject?: string; body?: string } | undefined;

function readTemplate(fd: FormData) {
  const key = str(fd, "key");
  if (!isTemplateKey(key)) return null;
  return { key, subject: String(fd.get("subject") ?? "").replace(/\s+/g, " ").trim(), body: String(fd.get("body") ?? "").replace(/\r\n?/g, "\n").trim() };
}

/** Saves the edited template. From then on every email of this kind is built from it. */
export async function saveTemplateAction(_prev: TemplateState, fd: FormData): Promise<TemplateState> {
  await requireAuth();
  const t = readTemplate(fd);
  if (!t) return { error: "Modèle inconnu." };
  const error = validateTemplate(t.subject, t.body, TEMPLATES[t.key].rules);
  if (error) return { error, subject: t.subject, body: t.body };
  const res = await db().from("email_templates").upsert({ key: t.key, subject: t.subject, body: t.body, updated_at: new Date().toISOString() });
  if (res.error) return { error: "Enregistrement impossible : " + res.error.message, subject: t.subject, body: t.body };
  revalidatePath("/modeles", "layout");
  return { saved: true, subject: t.subject, body: t.body };
}

/** Renders the template with example data, without saving. */
export async function previewTemplateAction(_prev: TemplateState, fd: FormData): Promise<TemplateState> {
  await requireAuth();
  const t = readTemplate(fd);
  if (!t) return { error: "Modèle inconnu." };
  const error = validateTemplate(t.subject, t.body, TEMPLATES[t.key].rules);
  if (error) return { error, subject: t.subject, body: t.body };
  const mail = sampleEmail(t.key, t);
  return { previewHtml: mail.html, previewSubject: mail.subject, subject: t.subject, body: t.body };
}

/** Removes the customization: the built-in template is used again. */
export async function resetTemplateAction(_prev: TemplateState, fd: FormData): Promise<TemplateState> {
  await requireAuth();
  const key = str(fd, "key");
  if (!isTemplateKey(key)) return { error: "Modèle inconnu." };
  const res = await db().from("email_templates").delete().eq("key", key);
  if (res.error) return { error: "Impossible de restaurer : " + res.error.message };
  revalidatePath("/modeles", "layout");
  return { saved: true, subject: TEMPLATES[key].subject, body: defaultBody(key) };
}
