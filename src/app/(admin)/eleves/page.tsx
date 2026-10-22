import Link from "next/link";
import { db } from "@/lib/db";
import { Empty, PageHeader, Pill, StatusPill } from "@/components/ui";
import { cycleLabel, fmtDate, fmtDateTime, membershipLabel, programLabel } from "@/lib/labels";
import type { Enrollment, EnrollmentStatus, Family, Group, Student } from "@/lib/types";

type Row = Student & { family: Family; enrollments: (Enrollment & { group: Group })[] };

const FILTERS: { key: string; label: string; test: (r: Row) => boolean }[] = [
  { key: "tous", label: "Tous", test: () => true },
  { key: "attente", label: "En attente", test: (r) => r.enrollments.some((e) => e.status === "envoye" || e.status === "relance") },
  { key: "appeler", label: "À appeler", test: (r) => r.enrollments.some((e) => e.status === "a_appeler") },
  { key: "confirme", label: "Tout confirmé", test: (r) => r.enrollments.length > 0 && r.enrollments.every((e) => e.status === "confirme") },
  { key: "tutorat", label: "Tutorat", test: (r) => r.enrollments.some((e) => e.group.program === "tutorat") },
  { key: "cf", label: "Classes Futées", test: (r) => r.enrollments.some((e) => e.group.program === "classes_futees") },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string }> }) {
  const { filtre = "tous", q = "" } = await searchParams;
  const res = await db().from("students").select("*, family:families(*), enrollments(*, group:groups(*))").order("created_at", { ascending: false });
  const all = (res.data ?? []) as Row[];
  const f = FILTERS.find((x) => x.key === filtre) ?? FILTERS[0];
  const needle = q.trim().toLowerCase();
  const rows = all.filter(f.test).filter(
    (r) => !needle || [r.first_name, r.family.parent_email, r.family.parent_name ?? "", ...r.enrollments.map((e) => e.group_code)].some((v) => v.toLowerCase().includes(needle)),
  );

  return (
    <div>
      <PageHeader
        title="Élèves"
        subtitle={`${all.length} élève${all.length > 1 ? "s" : ""} inscrit${all.length > 1 ? "s" : ""}`}
        actions={<Link href="/eleves/nouveau" className="btn btn-primary">+ Ajouter un élève</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/eleves?filtre=${x.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${x.key === f.key ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}
          >
            {x.label} <span className="opacity-60">{all.filter(x.test).length}</span>
          </Link>
        ))}
        <form className="ml-auto" action="/eleves">
          <input type="hidden" name="filtre" value={f.key} />
          <input name="q" defaultValue={q} placeholder="Rechercher (nom, courriel, groupe)" className="input w-64" />
        </form>
      </div>

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <Empty>Aucun élève ne correspond.</Empty>
        ) : (
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="th">Élève</th>
                <th className="th">Parent</th>
                <th className="th">Matières et confirmation</th>
                <th className="th">Abonnement</th>
                <th className="th">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50/60">
                  <td className="td">
                    <Link href={`/eleves/${r.id}`} className="font-semibold text-brand-700 hover:underline">{r.first_name}</Link>
                    <div className="text-xs text-stone-500">{[r.grade, cycleLabel(r.cycle)].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="td">
                    <div>{r.family.parent_name ?? "–"}</div>
                    <div className="text-xs text-stone-500">{r.family.parent_email}</div>
                  </td>
                  <td className="td">
                    <div className="flex flex-col gap-1.5">
                      {r.enrollments
                        .sort((a, b) => a.group_code.localeCompare(b.group_code))
                        .map((e) => (
                          <div key={e.id} className="flex items-center gap-2">
                            <span className="w-20 font-mono text-xs">{e.group_code}</span>
                            <StatusPill status={e.status as EnrollmentStatus} />
                          </div>
                        ))}
                    </div>
                  </td>
                  <td className="td">
                    <Pill tone={r.membership_status === "actif" ? "brand" : r.membership_status === "en_pause" ? "amber" : "stone"}>{membershipLabel[r.membership_status]}</Pill>
                    <div className="mt-1 text-xs text-stone-500">
                      {[...new Set(r.enrollments.map((e) => programLabel[e.group.program]))].join(", ")}
                    </div>
                    {r.end_date && <div className="text-xs text-stone-500">Fin : {fmtDate(r.end_date)}</div>}
                  </td>
                  <td className="td text-xs text-stone-500">{fmtDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
