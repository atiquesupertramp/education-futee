"use client";

import Link from "next/link";
import { subjectLabel, programLabel, SUBJECTS, paymentTypeLabel } from "@/lib/labels";
import type { Filters } from "@/lib/filters";

export interface GroupOption {
  code: string;
  program: string;
  subject: string;
  cycle: number;
}

const submitOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

/**
 * Programme / matière / groupe (/ paiement) filters as a plain GET form, so the
 * state lives in the URL and works without JavaScript; selects submit on change.
 */
export function FilterBar({
  action,
  filters,
  groups,
  keep = {},
  withSearch = false,
  withPayment = false,
}: {
  action: string;
  filters: Filters;
  groups: GroupOption[];
  /** Other query params to preserve (e.g. the status filter). */
  keep?: Record<string, string>;
  withSearch?: boolean;
  withPayment?: boolean;
}) {
  const visible = groups.filter((g) => (!filters.programme || g.program === filters.programme) && (!filters.matiere || g.subject === filters.matiere));
  const active = !!(filters.programme || filters.matiere || filters.groupe || filters.paiement || filters.q);
  const resetHref = Object.keys(keep).length ? `${action}?${new URLSearchParams(keep)}` : action;

  return (
    <form action={action} className="card mb-5 flex flex-wrap items-end gap-3 p-4">
      {Object.entries(keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {withSearch && (
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="f-q">Recherche</label>
          <input id="f-q" name="q" defaultValue={filters.q} placeholder="Nom, courriel, groupe…" className="input" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="f-programme">Programme</label>
        <select id="f-programme" name="programme" defaultValue={filters.programme} onChange={submitOnChange} className="input w-44">
          <option value="">Tous</option>
          <option value="tutorat">{programLabel.tutorat}</option>
          <option value="classes_futees">{programLabel.classes_futees}</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-matiere">Matière</label>
        <select id="f-matiere" name="matiere" defaultValue={filters.matiere} onChange={submitOnChange} className="input w-44">
          <option value="">Toutes</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{subjectLabel[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-groupe">Groupe</label>
        <select id="f-groupe" name="groupe" defaultValue={filters.groupe} onChange={submitOnChange} className="input w-44">
          <option value="">Tous</option>
          {visible.map((g) => (
            <option key={g.code} value={g.code}>{g.code}</option>
          ))}
          {filters.groupe && !visible.some((g) => g.code === filters.groupe) && <option value={filters.groupe}>{filters.groupe}</option>}
        </select>
      </div>
      {withPayment && (
        <div>
          <label className="label" htmlFor="f-paiement">Paiement</label>
          <select id="f-paiement" name="paiement" defaultValue={filters.paiement} onChange={submitOnChange} className="input w-44">
            <option value="">Tous</option>
            <option value="mensuel">{paymentTypeLabel.mensuel}</option>
            <option value="unique">{paymentTypeLabel.unique}</option>
            <option value="aucun">Non indiqué</option>
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary">{withSearch ? "Rechercher" : "Appliquer"}</button>
        {active && <Link href={resetHref} className="btn btn-secondary">Réinitialiser</Link>}
      </div>
    </form>
  );
}
