import Link from "next/link";
import { db } from "@/lib/db";
import { Avatar, Empty, PageHeader, Pill, StatusPill } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { cycleLabel, fmtDate, fmtDateTime, fmtMoney, membershipLabel, paymentTypeLabel, programLabel } from "@/lib/labels";
import { parseFilters, studentMatches } from "@/lib/filters";
import type { Enrollment, EnrollmentStatus, Family, Group, Student } from "@/lib/types";

type Row = Student & { family: Family; enrollments: (Enrollment & { group: Group })[] };

const STATUS: { key: string; label: string; test: (r: Row) => boolean }[] = [
  { key: "tous", label: "Tous", test: () => true },
  { key: "attente", label: "En attente", test: (r) => r.enrollments.some((e) => e.status === "envoye" || e.status === "relance") },
  { key: "appeler", label: "À appeler", test: (r) => r.enrollments.some((e) => e.status === "a_appeler") },
  { key: "confirme", label: "Tout confirmé", test: (r) => r.enrollments.length > 0 && r.enrollments.every((e) => e.status === "confirme") },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const filtre = typeof sp.filtre === "string" ? sp.filtre : "tous";
  const [res, gRes] = await Promise.all([
    db().from("students").select("*, family:families(*), enrollments(*, group:groups(*))").order("created_at", { ascending: false }),
    db().from("groups").select("code, program, subject, cycle").order("code"),
  ]);
  const all = (res.data ?? []) as Row[];
  const status = STATUS.find((x) => x.key === filtre) ?? STATUS[0];
  const needle = filters.q.trim().toLowerCase();

  const scoped = all
    .filter((r) => studentMatches(r, filters))
    .filter((r) => !needle || [r.first_name, r.family.parent_email, r.family.parent_name ?? "", ...r.enrollments.map((e) => e.group_code)].some((v) => v.toLowerCase().includes(needle)));
  const rows = scoped.filter(status.test);

  // Keep the filters in the status links.
  const carry = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) carry.set(k, v);

  return (
    <div>
      <PageHeader
        title="Élèves"
        subtitle={`${scoped.length} élève${scoped.length > 1 ? "s" : ""}${scoped.length !== all.length ? ` sur ${all.length}` : ""}`}
        actions={<Link href="/eleves/nouveau" className="btn btn-primary">+ Ajouter un élève</Link>}
      />

      <FilterBar action="/eleves" filters={filters} groups={gRes.data ?? []} keep={status.key === "tous" ? {} : { filtre: status.key }} withSearch withPayment />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS.map((x) => {
          const params = new URLSearchParams(carry);
          if (x.key !== "tous") params.set("filtre", x.key);
          return (
            <Link key={x.key} href={`/eleves${params.size ? `?${params}` : ""}`} className={`chip ${x.key === status.key ? "chip-on" : "chip-off"}`}>
              {x.label} <span className="opacity-60">{scoped.filter(x.test).length}</span>
            </Link>
          );
        })}
      </div>

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <Empty>Aucun élève ne correspond.</Empty>
        ) : (
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-stone-100 bg-stone-50/70">
              <tr>
                <th className="th">Élève</th>
                <th className="th">Parent</th>
                <th className="th">Matières et confirmation</th>
                <th className="th">Abonnement</th>
                <th className="th">Paiement</th>
                <th className="th">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-stone-50/60">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.first_name} />
                      <div>
                        <Link href={`/eleves/${r.id}`} className="font-semibold text-stone-900 hover:text-brand-700">{r.first_name}</Link>
                        <div className="text-xs text-stone-500">{[r.grade, cycleLabel(r.cycle)].filter(Boolean).join(" · ")}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <div>{r.family.parent_name ?? "–"}</div>
                    <div className="text-xs text-stone-500">{r.family.parent_email}</div>
                  </td>
                  <td className="td">
                    <div className="flex flex-col gap-1.5">
                      {[...r.enrollments]
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
                    <div className="mt-1 text-xs text-stone-500">{[...new Set(r.enrollments.map((e) => programLabel[e.group.program]))].join(", ")}</div>
                    {r.end_date && <div className="text-xs text-stone-500">Fin : {fmtDate(r.end_date)}</div>}
                  </td>
                  <td className="td">
                    {r.payment_type ? (
                      <>
                        <div className="font-semibold tabular-nums">{fmtMoney(r.payment_amount)}{r.payment_type === "mensuel" && <span className="font-normal text-stone-500"> /mois</span>}</div>
                        <div className="text-xs text-stone-500">{paymentTypeLabel[r.payment_type]}</div>
                      </>
                    ) : (
                      <span className="text-xs text-stone-400">Non indiqué</span>
                    )}
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
