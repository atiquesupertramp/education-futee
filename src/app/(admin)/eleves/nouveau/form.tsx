"use client";

import { useActionState, useMemo, useState } from "react";
import { createStudentAction, type FormState } from "@/app/actions";
import type { Group, Program, Subject } from "@/lib/types";
import { programLabel, subjectLabel } from "@/lib/labels";

const SUBJECTS: Subject[] = ["lecture", "ecriture", "math"];

function groupLine(g: Group) {
  return `${g.code} · ${[g.day, g.time].filter(Boolean).join(" ")}${g.teacher ? ` · ${g.teacher}` : ""}`;
}

export function NewStudentForm({ groups }: { groups: Group[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createStudentAction, undefined);
  const [cycle, setCycle] = useState<2 | 3 | null>(null);
  const [program, setProgram] = useState<Program>("tutorat");
  const [picked, setPicked] = useState<Record<Subject, string>>({ lecture: "", ecriture: "", math: "" });

  const options = useMemo(
    () => (s: Subject) => groups.filter((g) => g.cycle === cycle && g.program === program && g.subject === s),
    [groups, cycle, program],
  );
  const chosen = SUBJECTS.map((s) => groups.find((g) => g.code === picked[s])).filter(Boolean) as Group[];

  const reset = () => setPicked({ lecture: "", ecriture: "", math: "" });

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Parent</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="parent_name">Nom du parent</label>
              <input className="input" id="parent_name" name="parent_name" placeholder="Ex. : Marie Tremblay" />
            </div>
            <div>
              <label className="label" htmlFor="parent_email">Courriel du parent *</label>
              <input className="input" id="parent_email" name="parent_email" type="email" required placeholder="parent@exemple.com" />
            </div>
            <div>
              <label className="label" htmlFor="parent_phone">Téléphone du parent</label>
              <input className="input" id="parent_phone" name="parent_phone" type="tel" placeholder="514 555-0123" />
              <p className="mt-1 text-xs text-stone-500">Utilisé pour le SMS de rappel.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-stone-500">Un parent déjà inscrit (même courriel) est reconnu : l&apos;enfant est ajouté à la même famille.</p>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Enfant</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="first_name">Prénom de l&apos;enfant *</label>
              <input className="input" id="first_name" name="first_name" required />
            </div>
            <div>
              <label className="label" htmlFor="grade">Niveau scolaire</label>
              <select className="input" id="grade" name="grade" defaultValue="" onChange={(e) => {
                const n = Number(e.target.value.charAt(0));
                if (n >= 3 && n <= 6) { const c = n <= 4 ? 2 : 3; if (c !== cycle) { setCycle(c); reset(); } }
              }}>
                <option value="">Choisir…</option>
                {["3e année", "4e année", "5e année", "6e année"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cycle *</label>
              <div className="flex gap-2">
                {[2, 3].map((c) => (
                  <label key={c} className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-3 py-2 text-sm font-semibold ring-1 ${cycle === c ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-stone-300 hover:bg-stone-50"}`}>
                    <input type="radio" name="cycle" value={c} className="sr-only" required checked={cycle === c} onChange={() => { setCycle(c as 2 | 3); reset(); }} />
                    {c}e cycle
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Programme et groupes</h2>
          <p className="mb-4 text-sm text-stone-500">Choisissez le programme, puis le groupe pour chaque matière suivie (une, deux ou trois).</p>
          <div className="mb-5 flex gap-2">
            {(["tutorat", "classes_futees"] as Program[]).map((p) => (
              <label key={p} className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold ring-1 ${program === p ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-stone-300 hover:bg-stone-50"}`}>
                <input type="radio" className="sr-only" checked={program === p} onChange={() => { setProgram(p); reset(); }} />
                {programLabel[p]}
              </label>
            ))}
          </div>
          {!cycle ? (
            <p className="rounded-md bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 ring-1 ring-stone-200">Choisissez d&apos;abord le cycle de l&apos;enfant.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {SUBJECTS.map((s) => {
                const opts = options(s);
                return (
                  <div key={s}>
                    <label className="label" htmlFor={`g-${s}`}>{subjectLabel[s]}</label>
                    <select className="input" id={`g-${s}`} name="group_codes" value={picked[s]} onChange={(e) => setPicked({ ...picked, [s]: e.target.value })}>
                      <option value="">Pas inscrit</option>
                      {opts.map((g) => <option key={g.code} value={g.code}>{groupLine(g)}</option>)}
                    </select>
                    {opts.length === 0 && <p className="mt-1 text-xs text-stone-500">Aucun groupe actif.</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Abonnement</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="start_date">Début du programme</label>
              <input className="input" id="start_date" name="start_date" type="date" />
            </div>
            <div>
              <label className="label" htmlFor="end_date">Fin du programme</label>
              <input className="input" id="end_date" name="end_date" type="date" />
            </div>
            <div>
              <label className="label" htmlFor="closer_name">Conseillère</label>
              <input className="input" id="closer_name" name="closer_name" placeholder="Votre prénom" />
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <h2 className="font-semibold">Ce qui sera envoyé</h2>
          {chosen.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Aucun groupe choisi pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {chosen.map((g) => (
                <li key={g.code} className="rounded-md bg-brand-50 p-3 text-sm ring-1 ring-brand-100">
                  <div className="font-semibold">Courriel « Bienvenue {g.program === "tutorat" ? "au tutorat" : "dans les Classes Futées"} »</div>
                  <div className="text-stone-700">{subjectLabel[g.subject]} · {g.code}</div>
                  <div className="text-stone-500">{[g.day, g.time, g.teacher].filter(Boolean).join(" · ")}</div>
                  {g.notes && <div className="mt-1 text-xs text-amber-800">⚠ {g.notes}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs leading-relaxed text-stone-500">
            Sans confirmation après 24 h : rappel par courriel et SMS. Toujours rien 24 h plus tard : la famille est ajoutée à la liste « À appeler ».
          </p>
          {state?.error && <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={pending || chosen.length === 0}>
            {pending ? "Inscription…" : `Inscrire et envoyer ${chosen.length || ""} courriel${chosen.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </aside>
    </form>
  );
}
