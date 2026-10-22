import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Pill } from "@/components/ui";
import { cycleLabel, programLabel, subjectLabel } from "@/lib/labels";
import type { Group, Program } from "@/lib/types";

export default async function GroupsPage() {
  const [gRes, eRes] = await Promise.all([
    db().from("groups").select("*").order("code"),
    db().from("enrollments").select("group_code, student:students(membership_status)"),
  ]);
  const groups = (gRes.data ?? []) as Group[];
  const counts = new Map<string, number>();
  for (const e of (eRes.data ?? []) as unknown as { group_code: string; student: { membership_status: string } }[]) {
    if (e.student?.membership_status === "actif") counts.set(e.group_code, (counts.get(e.group_code) ?? 0) + 1);
  }
  const order = (g: Group) => `${g.cycle}${g.subject}${g.code}`;

  return (
    <div>
      <PageHeader
        title="Groupes"
        subtitle="Chaque plage horaire avec une enseignante a son propre code. Le code indique le cycle, le programme (CF) et la matière : 3CF-E-01 = 3e cycle, Classes Futées, Écriture, groupe 1."
        actions={<Link href="/groupes/nouveau" className="btn btn-primary">+ Nouveau groupe</Link>}
      />
      {(["tutorat", "classes_futees"] as Program[]).map((p) => (
        <section key={p} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{programLabel[p]}</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="th">Code</th>
                  <th className="th">Cycle · Matière</th>
                  <th className="th">Enseignante</th>
                  <th className="th">Plage</th>
                  {p === "tutorat" && <th className="th">Zoom</th>}
                  <th className="th text-right">Élèves actifs</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {groups
                  .filter((g) => g.program === p)
                  .sort((a, b) => order(a).localeCompare(order(b)))
                  .map((g) => (
                    <tr key={g.code} className={g.active ? "" : "opacity-50"}>
                      <td className="td font-mono font-semibold">{g.code}</td>
                      <td className="td">{cycleLabel(g.cycle)} · {subjectLabel[g.subject]}</td>
                      <td className="td">{g.teacher ?? <span className="text-stone-400">À assigner</span>}</td>
                      <td className="td">{[g.day, g.time].filter(Boolean).join(", ") || "–"}</td>
                      {p === "tutorat" && <td className="td text-xs">{g.zoom_url ? <span className="text-emerald-700">✓ Lien</span> : <span className="text-rose-700">Manquant</span>}{g.zoom_id ? ` · ${g.zoom_id}` : ""}</td>}
                      <td className="td text-right tabular-nums">{counts.get(g.code) ?? 0}</td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!g.active && <Pill>Inactif</Pill>}
                          {g.notes && <span title={g.notes}><Pill tone="amber">Note</Pill></span>}
                          <Link href={`/groupes/${encodeURIComponent(g.code)}`} className="text-sm font-semibold text-brand-700 hover:underline">Modifier</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
