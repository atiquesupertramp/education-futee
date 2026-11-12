import "server-only";
import type { Group, Student } from "./types";
import { appUrl } from "./db";
import { coursPhrase, cycleLabel, deSubject, subjectLabel, SUBJECTS } from "./labels";
import { renderEmail, type Block, type RenderedEmail, type Vars } from "./email-engine";
import { TEMPLATES, type TemplateKey } from "./email-defaults";

export type { RenderedEmail } from "./email-engine";

/*
 * Builds the emails from their templates (see email-engine.ts for the format
 * and email-store.ts for where edited templates are loaded from).
 */

export interface TemplateContent {
  subject: string;
  body: string;
}

const bySubject = (a: Group, b: Group) => SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject) || a.code.localeCompare(b.code);

/** "écriture et mathématiques" */
function joinFr(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

export function buildVars(s: Pick<Student, "first_name">, groups: Group[]): Vars {
  const sorted = [...groups].sort(bySubject);
  const subjects = [...new Set(sorted.map((g) => g.subject))];
  return {
    prenom: s.first_name,
    matieres: joinFr(subjects.map((x) => subjectLabel[x].toLowerCase())),
    cours_phrase: coursPhrase(subjects),
    groupes: sorted.map((g) => g.code).join(", "),
    nb_cours: String(sorted.length),
  };
}

/** One box per course: schedule, teacher and (Tutorat) Zoom details. */
export function coursBoxes(groups: Group[]): Block[] {
  return [...groups].sort(bySubject).map((g): Block => {
    const title = `📚 ${subjectLabel[g.subject]} · ${cycleLabel(g.cycle)}`;
    if (g.program === "tutorat") {
      const rows: [string, string][] = [
        ["Groupe :", g.code],
        ["Enseignante :", g.teacher ?? "À confirmer"],
        ["Journée :", g.day ?? "À confirmer"],
        ["Heure :", g.time ?? "À confirmer"],
      ];
      if (g.zoom_url) rows.push(["Lien Zoom :", g.zoom_url]);
      if (g.zoom_id) rows.push(["ID Zoom :", g.zoom_id]);
      if (g.zoom_password) rows.push(["Mot de passe :", g.zoom_password]);
      return { t: "box", title, rows, extra: g.zoom_url ? undefined : ["**Le lien Zoom de ce cours vous sera communiqué sous peu.**"] };
    }
    const plage = [g.day ? `le ${g.day.toLowerCase()}` : null, g.time ? `à ${g.time}` : null, g.teacher ? `avec Mme ${g.teacher}` : null].filter(Boolean).join(" ");
    return {
      t: "box",
      title,
      rows: [["Groupe :", g.code], ["Plage :", plage || "À confirmer"]],
      extra: ["👉 Cette plage devient votre plage horaire attitrée et doit être respectée chaque semaine."],
    };
  });
}

function make(key: TemplateKey, tpl: TemplateContent, s: Pick<Student, "first_name">, groups: Group[], opts: { buttonUrl?: string; coords?: Block | null } = {}): RenderedEmail {
  return renderEmail({
    subject: tpl.subject,
    body: tpl.body,
    preheader: TEMPLATES[key].preheader,
    vars: buildVars(s, groups),
    buttonUrl: opts.buttonUrl ?? "",
    coursBoxes: coursBoxes(groups),
    coordsBox: opts.coords ?? null,
    logoUrl: `${appUrl()}/logo-email.png`,
  });
}

/** One welcome email covering every group of the program. Button confirms them all. */
export const welcomeEmail = (tpl: TemplateContent, program: Group["program"], s: Student, groups: Group[], confirmUrl: string) =>
  make(program === "tutorat" ? "bienvenue_tutorat" : "bienvenue_classes_futees", tpl, s, groups, { buttonUrl: confirmUrl });

export const reminderEmail = (tpl: TemplateContent, s: Student, groups: Group[], confirmUrl: string) =>
  make("relance", tpl, s, groups, { buttonUrl: confirmUrl });

export const thanksEmail = (tpl: TemplateContent, s: Student, groups: Group[]) => make("merci", tpl, s, groups);

export function vaAlertEmail(
  tpl: TemplateContent,
  s: Student,
  parent: { name: string | null; email: string; phone: string | null },
  groups: Group[],
  studentUrl: string,
) {
  const coords: Block = {
    t: "box",
    title: "Coordonnées",
    rows: [
      ["Parent :", parent.name ?? "Non indiqué"],
      ["Courriel :", parent.email],
      ["Téléphone :", parent.phone ?? "Non indiqué"],
      ["Groupes :", [...groups].sort(bySubject).map((g) => g.code).join(", ")],
    ],
  };
  return make("alerte_va", tpl, s, groups, { buttonUrl: studentUrl, coords });
}

/** Example data for the preview on the template editor. */
export function sampleEmail(key: TemplateKey, tpl: TemplateContent): RenderedEmail {
  const program = key === "bienvenue_classes_futees" ? "classes_futees" : "tutorat";
  const cf = program === "classes_futees";
  const mk = (code: string, subject: Group["subject"], teacher: string, day: string, time: string): Group => ({
    code, program, cycle: 3, subject, teacher, day, time,
    zoom_url: cf ? null : "https://zoom.us/j/123456789", zoom_id: cf ? null : "123 456 789", zoom_password: cf ? null : "exemple",
    active: true, notes: null,
  });
  const groups = [mk(cf ? "3CF-E-01" : "3-E-01", "ecriture", "Julie", "Mardi", "18 h"), mk(cf ? "3CF-M-02" : "3-M-02", "math", "Sophie", "Jeudi", "17 h 30")];
  const s = { first_name: "Léa" } as Student;
  return make(key, tpl, s, groups, {
    buttonUrl: `${appUrl()}/confirmer/exemple`,
    coords: { t: "box", title: "Coordonnées", rows: [["Parent :", "Marie Tremblay"], ["Courriel :", "marie@exemple.com"], ["Téléphone :", "514 555-0123"], ["Groupes :", groups.map((g) => g.code).join(", ")]] },
  });
}

/* ------------------------------------------------------------------ */
/* SMS                                                                 */
/* ------------------------------------------------------------------ */

/** Strips accents so the SMS stays in the basic GSM alphabet (160 characters per segment instead of 70). */
const ascii = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "");

export const SMS_SEGMENT = 160;

/** Reminder SMS, kept to a single segment. Drops the opt-out line, then shortens the name, if needed. */
export function reminderSms(s: Student, link: string): string {
  const name = ascii(s.first_name).slice(0, 20);
  const full = `Education Futee: confirmez le courriel de ${name}: ${link} STOP=arret`;
  if (full.length <= SMS_SEGMENT) return full;
  return `Education Futee: confirmez le courriel de ${name}: ${link}`.slice(0, SMS_SEGMENT);
}

export { deSubject };
