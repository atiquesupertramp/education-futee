import type { EnrollmentStatus, MembershipStatus, Program, Subject } from "./types";

export const SUBJECTS: Subject[] = ["lecture", "ecriture", "math"];

export const subjectLabel: Record<Subject, string> = {
  lecture: "Lecture",
  ecriture: "Écriture",
  math: "Mathématiques",
};

/** "de lecture", "d'écriture", "de mathématiques" */
export function deSubject(s: Subject): string {
  return s === "ecriture" ? "d'écriture" : `de ${subjectLabel[s].toLowerCase()}`;
}

/** "le cours d'écriture" or "les cours d'écriture et de mathématiques" */
export function coursPhrase(subjects: Subject[]): string {
  const parts = subjects.map(deSubject);
  if (parts.length <= 1) return `le cours ${parts[0] ?? ""}`.trim();
  return `les cours ${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

export const programLabel: Record<Program, string> = {
  tutorat: "Tutorat",
  classes_futees: "Classes Futées",
};

export const cycleLabel = (c: number) => `${c}e cycle`;

export const enrollmentStatusLabel: Record<EnrollmentStatus, string> = {
  en_attente: "En attente d'envoi",
  envoye: "Courriel envoyé",
  relance: "Relancé (courriel + SMS)",
  a_appeler: "À appeler",
  confirme: "Confirmé",
  termine: "Terminé",
};

export const enrollmentStatusTone: Record<EnrollmentStatus, string> = {
  en_attente: "bg-stone-100 text-stone-700 ring-stone-300",
  envoye: "bg-sky-50 text-sky-800 ring-sky-200",
  relance: "bg-amber-50 text-amber-800 ring-amber-200",
  a_appeler: "bg-rose-50 text-rose-800 ring-rose-200",
  confirme: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  termine: "bg-stone-100 text-stone-500 ring-stone-200",
};

export const membershipLabel: Record<MembershipStatus, string> = {
  actif: "Actif",
  en_pause: "En pause",
  termine: "Terminé",
};

export const messageKindLabel: Record<string, string> = {
  bienvenue: "Bienvenue",
  relance: "Relance",
  sms_relance: "SMS de relance",
  merci: "Merci (confirmation reçue)",
  alerte_va: "Alerte à l'adjointe",
};

/** Programme, cycle and subject are all encoded in the group code, e.g. 3CF-E-01. */
export function parseGroupCode(code: string): { cycle: 2 | 3; program: Program; subject: Subject } | null {
  const m = /^([23])(CF)?-([LEM])-(\d{2,})$/i.exec(code.trim());
  if (!m) return null;
  const subject: Subject = m[3].toUpperCase() === "L" ? "lecture" : m[3].toUpperCase() === "E" ? "ecriture" : "math";
  return { cycle: Number(m[1]) as 2 | 3, program: m[2] ? "classes_futees" : "tutorat", subject };
}

const TZ = "America/Toronto";

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  return new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
}
