import { PageHeader } from "@/components/ui";
import { getSettings, REMINDER_AFTER_H, ESCALATE_AFTER_H } from "@/lib/onboarding";
import { resetDemoAction, saveSettingsAction } from "@/app/actions";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Paramètres" />
      <form action={saveSettingsAction} className="card space-y-4 p-6">
        <h2 className="font-semibold">Envoi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sender_email">Adresse d&apos;envoi</label>
            <input className="input" id="sender_email" name="sender_email" defaultValue={s.sender_email} />
          </div>
          <div>
            <label className="label" htmlFor="reply_to">Adresse de réponse</label>
            <input className="input" id="reply_to" name="reply_to" defaultValue={s.reply_to} />
            <p className="mt-1 text-xs text-stone-500">Les réponses des parents arrivent ici.</p>
          </div>
          <div>
            <label className="label" htmlFor="va_email">Courriel de l&apos;adjointe (alertes d&apos;appel)</label>
            <input className="input" id="va_email" name="va_email" defaultValue={s.va_email} />
          </div>
        </div>
        <button className="btn btn-primary">Enregistrer</button>
      </form>

      <section className="card space-y-2 p-6 text-sm">
        <h2 className="font-semibold">Règles de suivi</h2>
        <p>1. À l&apos;inscription : un courriel de bienvenue par matière, avec un bouton de confirmation.</p>
        <p>2. Sans confirmation après {REMINDER_AFTER_H} h : un rappel par courriel et un SMS (un seul par enfant, pour toutes les matières non confirmées).</p>
        <p>3. Toujours rien {ESCALATE_AFTER_H} h plus tard : la famille passe dans « À appeler » et l&apos;adjointe reçoit une alerte.</p>
        <p>4. À la confirmation : courriel de remerciement, et les relances s&apos;arrêtent pour cette matière.</p>
        <p className="text-stone-500">En production, les relances sont vérifiées automatiquement chaque jour. Dans la démo, utilisez « Avancer de 24 h » en haut de l&apos;écran.</p>
      </section>

      <form action={resetDemoAction} className="card space-y-3 p-6">
        <h2 className="font-semibold">Réinitialiser la démo</h2>
        <p className="text-sm text-stone-600">Supprime tous les élèves, familles, courriels et l&apos;historique, et remet l&apos;horloge à l&apos;heure réelle. Les groupes sont conservés.</p>
        <button className="btn btn-danger">Tout effacer et recommencer</button>
      </form>
    </div>
  );
}
