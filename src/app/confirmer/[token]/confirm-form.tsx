"use client";

import { useActionState } from "react";
import { confirmAction, type ConfirmState } from "./actions";

/** "le cours de lecture" -> "du cours de lecture"; "les cours …" -> "des cours …" */
const des = (cours: string) => cours.replace(/^les /, "des ").replace(/^le /, "du ");

export function ConfirmForm({ token, student, cours, codes }: { token: string; student: string; cours: string; codes: string[] }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmAction, undefined);

  if (state?.done) return <Thanks student={student} cours={cours} codes={codes} fresh />;

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Confirmez la réception</h1>
      <p className="mt-3 text-stone-700">
        Informations <strong>{des(cours)}</strong> de {student}.
      </p>
      <p className="mt-2 text-sm text-stone-500">En confirmant, vous nous indiquez avoir bien reçu et lu le courriel de bienvenue. Un seul clic confirme tous les cours de {student}.</p>
      <form action={action} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <button className="btn btn-primary w-full py-3 text-base" disabled={pending}>
          {pending ? "Confirmation…" : "Je confirme la réception"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {state.error}
        </p>
      )}
    </>
  );
}

export function Thanks({ student, cours, codes, fresh }: { student: string; cours: string; codes: string[]; fresh?: boolean }) {
  return (
    <div role="status">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{fresh ? "Merci, c'est confirmé! 💛" : "C'est déjà confirmé!"}</h1>
      <p className="mt-3 text-stone-700">
        Nous avons bien noté que vous avez reçu les informations <strong>{des(cours)}</strong> de {student}
        {codes.length ? ` (${codes.length > 1 ? "groupes" : "groupe"} ${codes.join(", ")})` : ""}.
      </p>
      <p className="mt-4 text-sm text-stone-500">Prochaine étape : surveillez vos courriels pour l&apos;invitation à la plateforme éducative (vérifiez aussi vos courriels indésirables). Vous pouvez fermer cette page.</p>
    </div>
  );
}
