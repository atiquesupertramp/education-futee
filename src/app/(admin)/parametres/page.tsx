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
        <div className="space-y-3 rounded-md bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
          <div>
            <label className="label" htmlFor="email_mode">Mode d&apos;envoi des courriels</label>
            <select className="input" id="email_mode" name="email_mode" defaultValue={s.email_mode}>
              <option value="simule">Simulation (rien n&apos;est envoyé)</option>
              <option value="test">Test (envoyé seulement aux adresses de test ci-dessous)</option>
              <option value="reel">Réel (envoyé aux parents)</option>
            </select>
            {s.email_mode === "reel" && <p className="mt-1 text-xs font-medium text-rose-700">Attention : les parents reçoivent de vrais courriels.</p>}
          </div>
          <div>
            <label className="label" htmlFor="test_recipients">Adresses de test</label>
            <input className="input" id="test_recipients" name="test_recipients" defaultValue={s.test_recipients} placeholder="vous@exemple.com, autre@exemple.com" />
            <p className="mt-1 text-xs text-stone-500">En mode test, tous les courriels (y compris l&apos;alerte de l&apos;adjointe) vont ici, avec « [TEST] » dans l&apos;objet.</p>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-md bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
          <input type="checkbox" name="sms_enabled" defaultChecked={s.sms_enabled} className="mt-0.5 h-4 w-4 accent-brand-700" />
          <span>
            <span className="font-medium">Envoyer aussi un SMS avec le rappel</span>
            <span className="block text-stone-500">Désactivé par défaut. Un seul SMS court par enfant (un segment de 160 caractères, sans accents), jamais avec le courriel de bienvenue.</span>
          </span>
        </label>
        <button className="btn btn-primary">Enregistrer</button>
      </form>

      <section className="card space-y-2 p-6 text-sm">
        <h2 className="font-semibold">Règles de suivi</h2>
        <p>1. À l&apos;inscription : un courriel de bienvenue par matière, avec un bouton de confirmation.</p>
        <p>2. Sans confirmation après {REMINDER_AFTER_H} h : un rappel par courriel{s.sms_enabled ? " et un SMS court" : ""} (un seul par enfant, pour toutes les matières non confirmées).</p>
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
