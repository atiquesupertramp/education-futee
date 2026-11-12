import type { Enrollment, Group, PaymentType, Program, Student, Subject } from "./types";
import { SUBJECTS } from "./labels";

/** Filters shared by the dashboard and the student list (all optional, all in the URL). */
export interface Filters {
  programme: Program | "";
  matiere: Subject | "";
  groupe: string;
  paiement: PaymentType | "aucun" | "";
  q: string;
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Raw): Filters {
  const programme = one(sp.programme);
  const matiere = one(sp.matiere);
  const paiement = one(sp.paiement);
  return {
    programme: programme === "tutorat" || programme === "classes_futees" ? programme : "",
    matiere: (SUBJECTS as string[]).includes(matiere) ? (matiere as Subject) : "",
    groupe: /^[0-9A-Za-z-]{1,20}$/.test(one(sp.groupe)) ? one(sp.groupe) : "",
    paiement: paiement === "mensuel" || paiement === "unique" || paiement === "aucun" ? paiement : "",
    q: one(sp.q).slice(0, 100),
  };
}

export const hasFilters = (f: Filters) => !!(f.programme || f.matiere || f.groupe || f.paiement || f.q);

type EnrollmentWithGroup = Pick<Enrollment, "group_code"> & { group: Pick<Group, "program" | "subject"> };

/** Does this enrollment satisfy programme + matière + groupe at the same time? */
export const enrollmentMatches = (e: EnrollmentWithGroup, f: Filters) =>
  (!f.programme || e.group.program === f.programme) && (!f.matiere || e.group.subject === f.matiere) && (!f.groupe || e.group_code === f.groupe);

export function studentMatches(s: Pick<Student, "payment_type"> & { enrollments: EnrollmentWithGroup[] }, f: Filters): boolean {
  if ((f.programme || f.matiere || f.groupe) && !s.enrollments.some((e) => enrollmentMatches(e, f))) return false;
  if (f.paiement === "aucun") return !s.payment_type;
  if (f.paiement && s.payment_type !== f.paiement) return false;
  return true;
}
