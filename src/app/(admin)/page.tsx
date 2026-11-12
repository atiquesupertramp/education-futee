import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Empty } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { enrollmentMatches, hasFilters, parseFilters } from "@/lib/filters";
import { fmtDateTime, fmtMoney, moneyValue, programLabel, subjectLabel } from "@/lib/labels";
import type { Enrollment, Group, Student } from "@/lib/types";

type Row = Enrollment & { group: Group; student: Pick<Student, "id" | "first_name" | "membership_status" | "payment_type" | "payment_amount"> };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const [enrRes, evRes, msgCount, gRes] = await Promise.all([
    db().from("enrollments").select("*, group:groups(*), student:students(id, first_name, membership_status, payment_type, payment_amount)"),
    db().from("events").select("*, student:students(id, first_name)").order("at", { ascending: false }).limit(12),
    db().from("messages").select("id", { count: "exact", head: true }),
    db().from("groups").select("code, program, subject, cycle").order("code"),
  ]);
  const everything = (enrRes.data ?? []) as Row[];
  const rows = everything.filter((r) => enrollmentMatches(r, filters));
  const events = (evRes.data ?? []) as { id: number; type: string; detail: string; at: string; student: { id: string; first_name: string } | null }[];
  const scoped = hasFilters(filters);

  const count = (pred: (r: Row) => boolean) => rows.filter(pred).length;
  const confirmed = count((r) => r.status === "confirme");
  const waiting = count((r) => r.status === "envoye");
  const reminded = count((r) => r.status === "relance");
  const toCall = new Set(rows.filter((r) => r.status === "a_appeler" && !r.call_done_at).map((r) => r.student_id)).size;
  const rate = rows.length ? Math.round((confirmed / rows.length) * 100) : 0;

  // Revenue is per child: count each child once, even with several subjects.
  const students = new Map<string, Row["student"]>();
  for (const r of rows) students.set(r.student_id, r.student);
  const active = [...students.values()].filter((s) => s.membership_status === "actif");
  const monthly = active.filter((s) => s.payment_type === "mensuel").reduce((t, s) => t + moneyValue(s.payment_amount), 0);
  const monthlyN = active.filter((s) => s.payment_type === "mensuel").length;
  const oneTime = [...students.values()].filter((s) => s.payment_type === "unique").reduce((t, s) => t + moneyValue(s.payment_amount), 0);
  const oneTimeN = [...students.values()].filter((s) => s.payment_type === "unique").length;
  const unpriced = active.filter((s) => !s.payment_type).length;

  const stats = [
    { label: "Élèves", value: String(students.size), hint: `${rows.length} inscription${rows.length > 1 ? "s" : ""} (matières)`, href: "/eleves", accent: "from-sky-500/10" },
    { label: "Revenu mensuel", value: fmtMoney(monthly), hint: `${monthlyN} élève${monthlyN > 1 ? "s" : ""} actif${monthlyN > 1 ? "s" : ""} en paiement mensuel`, href: "/eleves?paiement=mensuel", accent: "from-emerald-500/10" },
    { label: "Paiements uniques", value: fmtMoney(oneTime), hint: `${oneTimeN} élève${oneTimeN > 1 ? "s" : ""}${unpriced ? ` · ${unpriced} actif${unpriced > 1 ? "s" : ""} sans tarif` : ""}`, href: "/eleves?paiement=unique", accent: "from-brand-500/10" },
    { label: "Taux de confirmation", value: `${rate} %`, hint: `${confirmed} sur ${rows.length} confirmée${confirmed > 1 ? "s" : ""}`, href: "/eleves", accent: "from-violet-500/10" },
  ];

  const pipeline = [
    { label: "Courriel envoyé, en attente", value: waiting, tone: "bg-sky-500" },
    { label: "Relancé", value: reminded, tone: "bg-amber-500" },
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
        subtitle={scoped ? "Vue filtrée : les chiffres ci-dessous ne comptent que les inscriptions qui correspondent." : "Suivi de l'intégration des nouveaux élèves, de leurs inscriptions et de leurs paiements."}
        actions={<Link href="/eleves/nouveau" className="btn btn-primary">+ Ajouter un élève</Link>}
      />

      <FilterBar action="/" filters={filters} groups={gRes.data ?? []} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`card bg-gradient-to-br ${s.accent} to-white p-5 transition hover:-translate-y-0.5 hover:ring-stone-300`}>
            <div className="text-sm font-medium text-stone-500">{s.label}</div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-stone-500">{s.hint}</div>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-400">{msgCount.count ?? 0} courriels et SMS générés au total.</p>

      {toCall > 0 && (
        <Link href="/a-appeler" className="mt-4 flex items-center justify-between rounded-2xl bg-rose-50 px-5 py-3.5 text-sm text-rose-900 ring-1 ring-rose-200 transition hover:bg-rose-100">
          <span>
            <strong>{toCall} famille{toCall > 1 ? "s" : ""} à appeler</strong> : aucune confirmation après le rappel.
          </span>
          <span className="font-semibold">Voir la liste →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold tracking-tight">Où en sont les confirmations</h2>
          <p className="mb-5 text-sm text-stone-500">Une ligne par matière inscrite.</p>
          <div className="space-y-4">
            {pipeline.map((p) => (
              <div key={p.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="font-semibold tabular-nums">{p.value}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100">
                  <div className={`h-2 rounded-full ${p.tone} transition-all`} style={{ width: `${(p.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold tracking-tight">Élèves actifs par programme</h2>
          <p className="mb-5 text-sm text-stone-500">Nombre d&apos;inscriptions actives par matière.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="pb-2 font-medium">Programme</th>
                {(["lecture", "ecriture", "math"] as const).map((s) => (
                  <th key={s} className="pb-2 text-right font-medium">{subjectLabel[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.program} className="border-t border-stone-100">
                  <td className="py-3 font-medium">{programLabel[p.program]}</td>
                  {p.bySubject.map((s) => (
                    <td key={s.subject} className="py-3 text-right tabular-nums">{s.n}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="card-title">Activité récente</h2>
        {events.length === 0 ? (
          <Empty>
            Rien pour l&apos;instant. <Link href="/eleves/nouveau" className="font-semibold text-brand-700 underline">Ajoutez un premier élève</Link> pour voir le système en action.
          </Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 px-5 py-3 text-sm">
                <span className="w-28 shrink-0 text-xs text-stone-500">{fmtDateTime(e.at)}</span>
                {e.student && (
                  <Link href={`/eleves/${e.student.id}`} className="font-semibold text-brand-700 hover:underline">{e.student.first_name}</Link>
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
