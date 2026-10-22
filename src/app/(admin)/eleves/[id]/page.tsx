import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Pill, StatusPill } from "@/components/ui";
import { cycleLabel, fmtDateTime, messageKindLabel, programLabel, subjectLabel } from "@/lib/labels";
import type { Enrollment, EnrollmentStatus, Family, Group, Message, Student } from "@/lib/types";
import { confirmUrl } from "@/lib/onboarding";
import { confirmManualAction, deleteStudentAction, resendWelcomeAction, updateMembershipAction } from "@/app/actions";

type Full = Student & { family: Family & { students: Pick<Student, "id" | "first_name">[] }; enrollments: (Enrollment & { group: Group })[] };

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [sRes, mRes, evRes] = await Promise.all([
    db().from("students").select("*, family:families(*, students(id, first_name)), enrollments(*, group:groups(*))").eq("id", id).maybeSingle(),
    db().from("messages").select("id, channel, kind, to_address, subject, body_text, sent_at, enrollment_id, status").eq("student_id", id).order("sent_at", { ascending: true }),
    db().from("events").select("*").eq("student_id", id).order("at", { ascending: true }),
  ]);
  const s = sRes.data as Full | null;
  if (!s) notFound();
  const messages = (mRes.data ?? []) as Message[];
  const events = (evRes.data ?? []) as { id: number; type: string; detail: string; at: string }[];
  const siblings = s.family.students.filter((x) => x.id !== s.id);
  const enrollments = s.enrollments.sort((a, b) => a.group_code.localeCompare(b.group_code));

  return (
    <div>
      {nouveau && (
        <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <strong>{s.first_name} est inscrit.</strong> {enrollments.length} courriel{enrollments.length > 1 ? "s" : ""} de bienvenue généré{enrollments.length > 1 ? "s" : ""} pour {s.family.parent_email}. Ouvrez-les ci-dessous pour voir exactement ce que le parent reçoit.
        </div>
      )}
      <PageHeader
        title={s.first_name}
        subtitle={[s.grade, cycleLabel(s.cycle), [...new Set(enrollments.map((e) => programLabel[e.group.program]))].join(" + ")].filter(Boolean).join(" · ")}
        actions={<Link href="/eleves" className="btn btn-secondary">← Tous les élèves</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="border-b border-stone-100 px-5 py-3 font-semibold">Matières et confirmations</h2>
            <ul className="divide-y divide-stone-100">
              {enrollments.map((e) => (
                <li key={e.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold">{e.group_code}</span>
                    <span className="text-sm">{subjectLabel[e.group.subject]} · {programLabel[e.group.program]}</span>
                    <StatusPill status={e.status as EnrollmentStatus} />
                  </div>
                  <div className="mt-1 text-sm text-stone-600">{[e.group.day, e.group.time, e.group.teacher ? `avec ${e.group.teacher}` : null].filter(Boolean).join(" · ")}</div>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-stone-500 sm:grid-cols-2">
                    {e.welcome_sent_at && <span>Bienvenue envoyé : {fmtDateTime(e.welcome_sent_at)}</span>}
                    {e.reminder_sent_at && <span>Relance : {fmtDateTime(e.reminder_sent_at)}</span>}
                    {e.escalated_at && <span>Ajouté aux appels : {fmtDateTime(e.escalated_at)}</span>}
                    {e.confirmed_at && <span>Confirmé : {fmtDateTime(e.confirmed_at)} ({e.confirmed_via})</span>}
                    {e.next_action_at && <span>Prochaine étape prévue : {fmtDateTime(e.next_action_at)}</span>}
                    {e.call_done_at && <span>Appel fait : {fmtDateTime(e.call_done_at)}{e.call_notes ? `, ${e.call_notes}` : ""}</span>}
                  </div>
                  {e.status !== "confirme" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={confirmUrl(e.confirm_token)} target="_blank" className="btn btn-secondary py-1 text-xs" title="Ouvre la page que le parent voit en cliquant sur le bouton du courriel">
                        Simuler le clic du parent ↗
                      </a>
                      <form action={confirmManualAction}>
                        <input type="hidden" name="token" value={e.confirm_token} />
                        <input type="hidden" name="via" value="reponse" />
                        <button className="btn btn-secondary py-1 text-xs">Le parent a répondu CONFIRMER</button>
                      </form>
                      <form action={resendWelcomeAction}>
                        <input type="hidden" name="enrollment_id" value={e.id} />
                        <button className="btn btn-secondary py-1 text-xs">Renvoyer le courriel</button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="border-b border-stone-100 px-5 py-3 font-semibold">Courriels et SMS ({messages.length})</h2>
            <ul className="divide-y divide-stone-100">
              {messages.map((m) => (
                <li key={m.id}>
                  <Link href={`/messages/${m.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-stone-50">
                    <Pill tone={m.channel === "sms" ? "sky" : m.kind === "alerte_va" ? "rose" : m.kind === "merci" ? "brand" : "stone"}>
                      {m.channel === "sms" ? "SMS" : "Courriel"} · {messageKindLabel[m.kind] ?? m.kind}
                    </Pill>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.subject ?? m.body_text}</span>
                    <span className="text-xs text-stone-500">{m.to_address}</span>
                    <span className="w-28 text-right text-xs text-stone-500">{fmtDateTime(m.sent_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="border-b border-stone-100 px-5 py-3 font-semibold">Historique</h2>
            <ol className="space-y-3 px-5 py-4">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                  <span className="w-28 shrink-0 text-xs text-stone-500">{fmtDateTime(ev.at)}</span>
                  <span>{ev.detail}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Parent</h2>
            <div className="space-y-1">
              <div>{s.family.parent_name ?? "Nom non indiqué"}</div>
              <div><a className="text-brand-700 hover:underline" href={`mailto:${s.family.parent_email}`}>{s.family.parent_email}</a></div>
              <div>{s.family.parent_phone ?? "Téléphone non indiqué"}</div>
            </div>
            {siblings.length > 0 && (
              <div className="mt-3 border-t border-stone-100 pt-3">
                <div className="text-xs text-stone-500">Autres enfants de cette famille</div>
                {siblings.map((x) => (
                  <Link key={x.id} href={`/eleves/${x.id}`} className="mr-2 font-semibold text-brand-700 hover:underline">{x.first_name}</Link>
                ))}
              </div>
            )}
            {s.closer_name && <div className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">Inscrit par {s.closer_name}</div>}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Abonnement</h2>
            <form action={updateMembershipAction} className="space-y-3">
              <input type="hidden" name="student_id" value={s.id} />
              <div>
                <label className="label" htmlFor="membership_status">Statut</label>
                <select className="input" id="membership_status" name="membership_status" defaultValue={s.membership_status}>
                  <option value="actif">Actif</option>
                  <option value="en_pause">En pause</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="start_date">Début</label>
                  <input className="input" id="start_date" type="date" name="start_date" defaultValue={s.start_date ?? ""} />
                </div>
                <div>
                  <label className="label" htmlFor="end_date">Fin</label>
                  <input className="input" id="end_date" type="date" name="end_date" defaultValue={s.end_date ?? ""} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="notes">Notes</label>
                <textarea className="input" id="notes" name="notes" rows={3} defaultValue={s.notes ?? ""} />
              </div>
              <button className="btn btn-primary w-full">Enregistrer</button>
              <p className="text-xs text-stone-500">Les relances automatiques s&apos;arrêtent si l&apos;abonnement n&apos;est pas actif.</p>
            </form>
          </section>

          <form action={deleteStudentAction}>
            <input type="hidden" name="student_id" value={s.id} />
            <button className="btn btn-danger w-full">Supprimer cet élève</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
