"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveGroupAction, type FormState } from "@/app/actions";
import type { Group } from "@/lib/types";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function GroupForm({ group }: { group?: Group }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveGroupAction, undefined);
  return (
    <form action={action} className="card max-w-3xl space-y-5 p-6">
      <input type="hidden" name="original_code" value={group?.code ?? ""} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="code">Code du groupe *</label>
          <input className="input font-mono uppercase" id="code" name="code" required defaultValue={group?.code} placeholder="3-M-04" />
          <p className="mt-1 text-xs text-stone-500">Cycle-Matière-Numéro. Ajoutez CF pour Classes Futées : 2CF-L-03.</p>
        </div>
        <div>
          <label className="label" htmlFor="teacher">Enseignante</label>
          <input className="input" id="teacher" name="teacher" defaultValue={group?.teacher ?? ""} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" defaultChecked={group?.active ?? true} className="h-4 w-4 accent-brand-700" />
            Groupe actif (proposé à l&apos;inscription)
          </label>
        </div>
        <div>
          <label className="label" htmlFor="day">Journée</label>
          <select className="input" id="day" name="day" defaultValue={group?.day ?? ""}>
            <option value="">–</option>
            {DAYS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="time">Heure</label>
          <input className="input" id="time" name="time" defaultValue={group?.time ?? ""} placeholder="18 h 15" />
        </div>
      </div>
      <fieldset className="grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Zoom (affiché dans le courriel de tutorat)</legend>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="zoom_url">Lien Zoom</label>
          <input className="input" id="zoom_url" name="zoom_url" type="url" defaultValue={group?.zoom_url ?? ""} placeholder="https://us06web.zoom.us/j/…" />
        </div>
        <div>
          <label className="label" htmlFor="zoom_id">ID de réunion</label>
          <input className="input" id="zoom_id" name="zoom_id" defaultValue={group?.zoom_id ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="zoom_password">Mot de passe</label>
          <input className="input" id="zoom_password" name="zoom_password" defaultValue={group?.zoom_password ?? ""} />
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="notes">Notes internes</label>
        <textarea className="input" id="notes" name="notes" rows={2} defaultValue={group?.notes ?? ""} />
      </div>
      {state?.error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
        <Link href="/groupes" className="btn btn-secondary">Annuler</Link>
      </div>
    </form>
  );
}
