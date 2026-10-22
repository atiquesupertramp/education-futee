import Link from "next/link";
import { db } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDateTime, subjectLabel } from "@/lib/labels";
import type { Enrollment, Family, Group, Student } from "@/lib/types";
import { callDoneAction } from "@/app/actions";

type Row = Enrollment & { group: Group; student: Student & { family: Family } };

export default async function CallListPage() {
  const rows = ((await db().from("enrollments").select("*, group:groups(*), student:students(*, family:families(*))").eq("status", "a_appeler").order("escalated_at")).data ?? []) as Row[];
  const byStudent = new Map<string, Row[]>();
  for (const r of rows) byStudent.set(r.student_id, [...(byStudent.get(r.student_id) ?? []), r]);
  const open = [...byStudent.values()].filter((list) => list.some((r) => !r.call_done_at));
  const done = [...byStudent.values()].filter((list) => list.every((r) => r.call_done_at));

  return (
    <div>
      <PageHeader title="À appeler" subtitle="Familles sans confirmation après le courriel de bienvenue et le rappel. Karine reçoit aussi une alerte par courriel." />
      <div className="space-y-3">
        {open.length === 0 && <div className="card"><Empty>Personne à appeler pour l&apos;instant. 🎉</Empty></div>}
        {open.map((list) => {
          const s = list[0].student;
          return (
            <div key={s.id} className="card flex flex-wrap items-start gap-6 p-5">
              <div className="min-w-48 flex-1">
                <Link href={`/eleves/${s.id}`} className="text-lg font-semibold text-brand-700 hover:underline">{s.first_name}</Link>
                <div className="text-sm">{s.family.parent_name ?? "Parent"}</div>
                <div className="text-sm"><a href={`tel:${s.family.parent_phone ?? ""}`} className="font-semibold">{s.family.parent_phone ?? "Pas de téléphone"}</a></div>
                <div className="text-xs text-stone-500">{s.family.parent_email}</div>
              </div>
              <div className="min-w-48 flex-1 text-sm">
                {list.map((r) => (
                  <div key={r.id}><span className="font-mono text-xs">{r.group_code}</span> · {subjectLabel[r.group.subject]}</div>
                ))}
                <div className="mt-1 text-xs text-stone-500">Ajouté le {fmtDateTime(list[0].escalated_at)}</div>
              </div>
              <form action={callDoneAction} className="flex min-w-64 flex-1 flex-col gap-2">
                <input type="hidden" name="student_id" value={s.id} />
                <input name="notes" className="input" placeholder="Note d'appel (facultatif)" />
                <button className="btn btn-primary">Appel fait</button>
              </form>
            </div>
          );
        })}
      </div>
      {done.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-semibold text-stone-600">Appels faits, toujours non confirmés</h2>
          <div className="card divide-y divide-stone-100">
            {done.map((list) => (
              <div key={list[0].student_id} className="flex flex-wrap gap-4 px-5 py-3 text-sm">
                <Link href={`/eleves/${list[0].student_id}`} className="font-semibold text-brand-700 hover:underline">{list[0].student.first_name}</Link>
                <span className="text-stone-600">{list.map((r) => r.group_code).join(", ")}</span>
                <span className="text-stone-500">Appel : {fmtDateTime(list[0].call_done_at)}{list[0].call_notes ? `, ${list[0].call_notes}` : ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
