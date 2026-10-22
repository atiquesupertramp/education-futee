import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Empty } from "@/components/ui";
import { fmtDateTime, programLabel, subjectLabel } from "@/lib/labels";
import type { Enrollment, Group, Student } from "@/lib/types";

type Row = Enrollment & { group: Group; student: Pick<Student, "id" | "first_name" | "membership_status"> };

export default async function Dashboard() {
  const [enrRes, evRes, msgCount, stuCount] = await Promise.all([
    db().from("enrollments").select("*, group:groups(*), student:students(id, first_name, membership_status)"),
    db().from("events").select("*, student:students(id, first_name)").order("at", { ascending: false }).limit(12),
    db().from("messages").select("id", { count: "exact", head: true }),
    db().from("students").select("id", { count: "exact", head: true }),
  ]);
  const rows = (enrRes.data ?? []) as Row[];
  const events = (evRes.data ?? []) as { id: number; type: string; detail: string; at: string; student: { id: string; first_name: string } | null }[];

  const count = (pred: (r: Row) => boolean) => rows.filter(pred).length;
  const confirmed = count((r) => r.status === "confirme");
  const waiting = count((r) => r.status === "envoye");
  const reminded = count((r) => r.status === "relance");
  const toCall = new Set(rows.filter((r) => r.status === "a_appeler" && !r.call_done_at).map((r) => r.student_id)).size;
  const rate = rows.length ? Math.round((confirmed / rows.length) * 100) : 0;

  const stats = [
    { label: "Élèves", value: stuCount.count ?? 0, href: "/eleves" },
    { label: "Inscriptions (matières)", value: rows.length, href: "/eleves" },
    { label: "Courriels générés", value: msgCount.count ?? 0, href: "/messages" },
    { label: "Taux de confirmation", value: `${rate} %`, href: "/eleves" },
  ];

  const pipeline = [
    { label: "Courriel envoyé, en attente", value: waiting, tone: "bg-sky-500" },
    { label: "Relancé (courriel + SMS)", value: reminded, tone: "bg-amber-500" },
    { label: "À appeler", value: count((r) => r.status === "a_appeler"), tone: "bg-rose-500" },
    { label: "Confirmé", value: confirmed, tone: "bg-emerald-600" },
  ];
  const max = Math.max(1, ...pipeline.map((p) => p.value));

  const programs = (["tutorat", "classes_futees"] as const).map((p) => ({
    program: p,
    bySubject: (["lecture", "ecriture", "math"] as const).map((s) => ({
      subject: s,
      n: count((r) => r.group.program === p && r.group.subject === s && r.student.membership_status === "actif"),
    })),
  }));

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Suivi de l'intégration des nouveaux élèves et de leurs inscriptions."
        actions={
          <Link href="/eleves/nouveau" className="btn btn-primary">
            + Ajouter un élève
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:ring-stone-300">
            <div className="text-sm text-stone-600">{s.label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{s.value}</div>
          </Link>
        ))}
      </div>

      {toCall > 0 && (
        <Link href="/a-appeler" className="mt-4 flex items-center justify-between rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200 hover:bg-rose-100">
          <span>
            <strong>{toCall} famille{toCall > 1 ? "s" : ""} à appeler</strong> : aucune confirmation après le rappel.
          </span>
          <span className="font-semibold">Voir la liste →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Où en sont les confirmations</h2>
          <p className="mb-4 text-sm text-stone-500">Une ligne par matière inscrite.</p>
          <div className="space-y-3">
            {pipeline.map((p) => (
              <div key={p.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="font-semibold tabular-nums">{p.value}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100">
                  <div className={`h-2 rounded-full ${p.tone}`} style={{ width: `${(p.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Élèves actifs par programme</h2>
          <p className="mb-4 text-sm text-stone-500">Nombre d&apos;inscriptions actives par matière.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="pb-2 font-medium">Programme</th>
                {(["lecture", "ecriture", "math"] as const).map((s) => (
                  <th key={s} className="pb-2 text-right font-medium">
                    {subjectLabel[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.program} className="border-t border-stone-100">
                  <td className="py-2 font-medium">{programLabel[p.program]}</td>
                  {p.bySubject.map((s) => (
                    <td key={s.subject} className="py-2 text-right tabular-nums">
                      {s.n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="border-b border-stone-100 px-5 py-3 font-semibold">Activité récente</h2>
        {events.length === 0 ? (
          <Empty>
            Rien pour l&apos;instant. <Link href="/eleves/nouveau" className="font-semibold text-brand-700 underline">Ajoutez un premier élève</Link> pour voir le système en action.
          </Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 px-5 py-2.5 text-sm">
                <span className="w-28 shrink-0 text-xs text-stone-500">{fmtDateTime(e.at)}</span>
                {e.student && (
                  <Link href={`/eleves/${e.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {e.student.first_name}
                  </Link>
                )}
                <span className="text-stone-700">{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
