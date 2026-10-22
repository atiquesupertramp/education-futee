import "server-only";
import { appUrl, db, must } from "./db";
import type { Enrollment, Family, Group, Settings, Student } from "./types";
import { coursPhrase, parseGroupCode, subjectLabel } from "./labels";
import {
  classesFuteesWelcome,
  reminderEmail,
  reminderSms,
  thanksEmail,
  tutoratWelcome,
  vaAlertEmail,
  type PendingItem,
} from "./emails";

/** Hours before the first reminder, then before the call task. */
export const REMINDER_AFTER_H = 24;
export const ESCALATE_AFTER_H = 24;

const HOUR = 3_600_000;

export async function getSettings(): Promise<Settings> {
  return must(await db().from("settings").select("*").eq("id", 1).single(), "Paramètres");
}

/** Demo clock: real time plus the offset added with "Avancer le temps". */
export async function demoNow(settings?: Settings): Promise<Date> {
  const s = settings ?? (await getSettings());
  return new Date(Date.now() + s.demo_offset_hours * HOUR);
}

export const confirmUrl = (token: string) => `${appUrl()}/confirmer/${token}`;

async function logEvent(student_id: string | null, enrollment_id: string | null, type: string, detail: string, at: Date) {
  await db().from("events").insert({ student_id, enrollment_id, type, detail, at: at.toISOString() });
}

async function recordMessage(m: {
  student_id: string;
  enrollment_id?: string | null;
  channel: "email" | "sms";
  kind: string;
  to_address: string;
  subject?: string | null;
  body_html?: string | null;
  body_text: string;
  at: Date;
}) {
  // Demo mode: nothing leaves the app. The message is stored exactly as it
  // would be sent, so it can be previewed from the dashboard.
  must(
    await db().from("messages").insert({
      student_id: m.student_id,
      enrollment_id: m.enrollment_id ?? null,
      channel: m.channel,
      kind: m.kind,
      to_address: m.to_address,
      subject: m.subject ?? null,
      body_html: m.body_html ?? null,
      body_text: m.body_text,
      status: "simule",
      sent_at: m.at.toISOString(),
    }),
    "Enregistrement du message",
  );
}

/* ------------------------------------------------------------------ */
/* New student                                                         */
/* ------------------------------------------------------------------ */

export interface NewStudentInput {
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  first_name: string;
  grade: string;
  cycle: 2 | 3;
  start_date: string;
  end_date: string;
  closer_name: string;
  group_codes: string[];
}

export async function createStudent(input: NewStudentInput): Promise<string> {
  const email = input.parent_email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Courriel du parent invalide.");
  if (!input.first_name.trim()) throw new Error("Le prénom de l'enfant est requis.");
  const codes = [...new Set(input.group_codes.filter(Boolean))];
  if (codes.length === 0) throw new Error("Choisissez au moins un groupe.");

  const groups = must(await db().from("groups").select("*").in("code", codes), "Groupes") as Group[];
  const seenSubjects = new Set<string>();
  for (const code of codes) {
    const g = groups.find((x) => x.code === code);
    if (!g) throw new Error(`Groupe introuvable : ${code}`);
    if (!g.active) throw new Error(`Le groupe ${code} est inactif.`);
    if (g.cycle !== input.cycle) throw new Error(`Le groupe ${code} est au ${g.cycle}e cycle, mais l'élève est au ${input.cycle}e cycle.`);
    const key = `${g.program}-${g.subject}`;
    if (seenSubjects.has(key)) throw new Error(`Un seul groupe par matière : ${subjectLabel[g.subject]} est choisi deux fois.`);
    seenSubjects.add(key);
  }

  const now = await demoNow();

  // One family per parent email: a second child reuses the same family.
  const existing = must(await db().from("families").select("*").ilike("parent_email", email).limit(1), "Famille") as Family[];
  let family: Family;
  if (existing[0]) {
    family = existing[0];
    const patch: Partial<Family> = {};
    if (input.parent_name.trim() && !family.parent_name) patch.parent_name = input.parent_name.trim();
    if (input.parent_phone.trim()) patch.parent_phone = input.parent_phone.trim();
    if (Object.keys(patch).length) await db().from("families").update(patch).eq("id", family.id);
  } else {
    family = must(
      await db()
        .from("families")
        .insert({ parent_name: input.parent_name.trim() || null, parent_email: email, parent_phone: input.parent_phone.trim() || null })
        .select("*")
        .single(),
      "Création de la famille",
    ) as Family;
  }

  const student = must(
    await db()
      .from("students")
      .insert({
        family_id: family.id,
        first_name: input.first_name.trim(),
        grade: input.grade.trim() || null,
        cycle: input.cycle,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        closer_name: input.closer_name.trim() || null,
      })
      .select("*")
      .single(),
    "Création de l'élève",
  ) as Student;

  await logEvent(student.id, null, "inscription", `Inscrit par ${input.closer_name.trim() || "la conseillère"} : ${codes.join(", ")}`, now);

  const enrollments = must(
    await db()
      .from("enrollments")
      .insert(codes.map((code) => ({ student_id: student.id, group_code: code })))
      .select("*"),
    "Inscriptions aux groupes",
  ) as Enrollment[];

  for (const e of enrollments) {
    await sendWelcome(e, student, family, groups.find((g) => g.code === e.group_code)!, now);
  }
  return student.id;
}

async function sendWelcome(e: Enrollment, s: Student, f: Family, g: Group, now: Date) {
  const mail = g.program === "tutorat" ? tutoratWelcome(g, s, confirmUrl(e.confirm_token)) : classesFuteesWelcome(g, s, confirmUrl(e.confirm_token));
  await recordMessage({
    student_id: s.id,
    enrollment_id: e.id,
    channel: "email",
    kind: "bienvenue",
    to_address: f.parent_email,
    subject: mail.subject,
    body_html: mail.html,
    body_text: mail.text,
    at: now,
  });
  must(
    await db()
      .from("enrollments")
      .update({ status: "envoye", welcome_sent_at: now.toISOString(), next_action_at: new Date(now.getTime() + REMINDER_AFTER_H * HOUR).toISOString() })
      .eq("id", e.id),
    "Mise à jour de l'inscription",
  );
  await logEvent(s.id, e.id, "courriel", `Courriel de bienvenue envoyé (${g.code}) à ${f.parent_email}`, now);
}

export async function resendWelcome(enrollmentId: string) {
  const e = must(await db().from("enrollments").select("*, student:students(*, family:families(*)), group:groups(*)").eq("id", enrollmentId).single(), "Inscription") as EnrollmentFull;
  const now = await demoNow();
  await sendWelcome(e, e.student, e.student.family, e.group, now);
}

/* ------------------------------------------------------------------ */
/* Confirmation                                                        */
/* ------------------------------------------------------------------ */

type EnrollmentFull = Enrollment & { group: Group; student: Student & { family: Family } };

export async function lookupToken(token: string): Promise<{ status: string; student: string; subject: string; cours: string; code: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const e = (await db().from("enrollments").select("status, student:students(first_name), group:groups(code, subject)").eq("confirm_token", token).maybeSingle()).data as unknown as
    | { status: string; student: { first_name: string }; group: { code: string; subject: Group["subject"] } }
    | null;
  if (!e) return null;
  return { status: e.status, student: e.student.first_name, subject: subjectLabel[e.group.subject], cours: coursPhrase([e.group.subject]), code: e.group.code };
}

export async function confirmByToken(token: string, via: "bouton" | "manuel" | "reponse"): Promise<{ ok: boolean; already?: boolean; student?: string; subject?: string; code?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false };
  const res = await db().from("enrollments").select("*, student:students(*, family:families(*)), group:groups(*)").eq("confirm_token", token).maybeSingle();
  const e = res.data as EnrollmentFull | null;
  if (!e) return { ok: false };
  const base = { student: e.student.first_name, subject: subjectLabel[e.group.subject], code: e.group.code };
  if (e.status === "confirme") return { ok: true, already: true, ...base };

  const now = await demoNow();
  must(
    await db()
      .from("enrollments")
      .update({ status: "confirme", confirmed_at: now.toISOString(), confirmed_via: via, next_action_at: null })
      .eq("id", e.id),
    "Confirmation",
  );
  const how = via === "bouton" ? "par le parent (bouton du courriel)" : via === "reponse" ? "par réponse du parent" : "manuellement par l'équipe";
  await logEvent(e.student.id, e.id, "confirmation", `Confirmé ${how} (${e.group.code})`, now);

  const mail = thanksEmail(e.group, e.student);
  await recordMessage({
    student_id: e.student.id,
    enrollment_id: e.id,
    channel: "email",
    kind: "merci",
    to_address: e.student.family.parent_email,
    subject: mail.subject,
    body_html: mail.html,
    body_text: mail.text,
    at: now,
  });
  return { ok: true, ...base };
}

/* ------------------------------------------------------------------ */
/* Follow-ups: run by the scheduler, or by "Avancer le temps"           */
/* ------------------------------------------------------------------ */

export async function processDue(): Promise<{ reminders: number; escalations: number }> {
  const settings = await getSettings();
  const now = await demoNow(settings);
  const due = must(
    await db()
      .from("enrollments")
      .select("*, student:students(*, family:families(*)), group:groups(*)")
      .in("status", ["envoye", "relance"])
      .lte("next_action_at", now.toISOString()),
    "Relances à faire",
  ) as EnrollmentFull[];

  // One reminder (and one SMS) per child covering every unconfirmed subject,
  // rather than one per subject, so parents are not flooded.
  const byStudent = new Map<string, { remind: EnrollmentFull[]; escalate: EnrollmentFull[] }>();
  for (const e of due) {
    if (e.student.membership_status !== "actif") continue;
    const bucket = byStudent.get(e.student_id) ?? { remind: [], escalate: [] };
    (e.status === "envoye" ? bucket.remind : bucket.escalate).push(e);
    byStudent.set(e.student_id, bucket);
  }

  let reminders = 0;
  let escalations = 0;
  for (const { remind, escalate } of byStudent.values()) {
    if (remind.length) {
      const s = remind[0].student;
      const items: PendingItem[] = remind.map((e) => ({ group: e.group, confirmUrl: confirmUrl(e.confirm_token) }));
      const mail = reminderEmail(s, items);
      await recordMessage({ student_id: s.id, channel: "email", kind: "relance", to_address: s.family.parent_email, subject: mail.subject, body_html: mail.html, body_text: mail.text, at: now });
      if (s.family.parent_phone) {
        await recordMessage({ student_id: s.id, channel: "sms", kind: "sms_relance", to_address: s.family.parent_phone, body_text: reminderSms(s, items, items[0].confirmUrl), at: now });
      }
      for (const e of remind) {
        await db()
          .from("enrollments")
          .update({ status: "relance", reminder_sent_at: now.toISOString(), next_action_at: new Date(now.getTime() + ESCALATE_AFTER_H * HOUR).toISOString() })
          .eq("id", e.id);
      }
      await logEvent(s.id, null, "relance", `Relance envoyée (courriel${s.family.parent_phone ? " + SMS" : ""}) : ${remind.map((e) => e.group.code).join(", ")}`, now);
      reminders++;
    }
    if (escalate.length) {
      const s = escalate[0].student;
      const codes = escalate.map((e) => e.group.code);
      const mail = vaAlertEmail(s, { name: s.family.parent_name, email: s.family.parent_email, phone: s.family.parent_phone }, codes, `${appUrl()}/eleves/${s.id}`);
      await recordMessage({ student_id: s.id, channel: "email", kind: "alerte_va", to_address: settings.va_email, subject: mail.subject, body_html: mail.html, body_text: mail.text, at: now });
      for (const e of escalate) {
        await db().from("enrollments").update({ status: "a_appeler", escalated_at: now.toISOString(), next_action_at: null }).eq("id", e.id);
      }
      await logEvent(s.id, null, "a_appeler", `Ajouté à la liste d'appels : ${codes.join(", ")}`, now);
      escalations++;
    }
  }
  return { reminders, escalations };
}

export async function advanceClock(hours: number) {
  const s = await getSettings();
  await db().from("settings").update({ demo_offset_hours: s.demo_offset_hours + hours }).eq("id", 1);
  return processDue();
}

export async function markCallDone(studentId: string, notes: string) {
  const now = await demoNow();
  const open = must(await db().from("enrollments").select("id").eq("student_id", studentId).eq("status", "a_appeler"), "Appels") as { id: string }[];
  for (const e of open) {
    await db().from("enrollments").update({ call_done_at: now.toISOString(), call_notes: notes || null }).eq("id", e.id);
  }
  await logEvent(studentId, null, "appel", `Appel fait${notes ? ` : ${notes}` : ""}`, now);
}

export async function resetDemo() {
  await db().from("events").delete().gte("id", 0);
  await db().from("messages").delete().not("id", "is", null);
  await db().from("families").delete().not("id", "is", null);
  await db().from("settings").update({ demo_offset_hours: 0 }).eq("id", 1);
}

export { parseGroupCode };
