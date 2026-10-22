import Link from "next/link";
import { db } from "@/lib/db";
import { Empty, PageHeader, Pill } from "@/components/ui";
import { fmtDateTime, messageKindLabel } from "@/lib/labels";

type Row = { id: string; channel: string; kind: string; to_address: string; subject: string | null; body_text: string | null; sent_at: string; student: { id: string; first_name: string } | null };

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type = "" } = await searchParams;
  let q = db().from("messages").select("id, channel, kind, to_address, subject, body_text, sent_at, student:students(id, first_name)").order("sent_at", { ascending: false }).limit(300);
  if (type) q = q.eq("kind", type);
  const rows = ((await q).data ?? []) as unknown as Row[];
  const kinds = ["", "bienvenue", "relance", "sms_relance", "merci", "alerte_va"];

  return (
    <div>
      <PageHeader title="Boîte d'envoi" subtitle="Tous les courriels et SMS générés par le système. En mode démo, rien n'est réellement envoyé." />
      <div className="mb-4 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <Link key={k || "all"} href={k ? `/messages?type=${k}` : "/messages"} className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${k === type ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}>
            {k ? messageKindLabel[k] : "Tous"}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <Empty>Aucun message pour l&apos;instant.</Empty>
        ) : (
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="th">Type</th>
                <th className="th">Objet</th>
                <th className="th">Destinataire</th>
                <th className="th">Élève</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50/60">
                  <td className="td">
                    <Pill tone={m.channel === "sms" ? "sky" : m.kind === "alerte_va" ? "rose" : m.kind === "merci" ? "brand" : "stone"}>{m.channel === "sms" ? "SMS" : "Courriel"} · {messageKindLabel[m.kind] ?? m.kind}</Pill>
                  </td>
                  <td className="td max-w-xs">
                    <Link href={`/messages/${m.id}`} className="line-clamp-2 font-medium text-brand-700 hover:underline">{m.subject ?? m.body_text}</Link>
                  </td>
                  <td className="td text-xs">{m.to_address}</td>
                  <td className="td">{m.student && <Link href={`/eleves/${m.student.id}`} className="hover:underline">{m.student.first_name}</Link>}</td>
                  <td className="td text-xs text-stone-500">{fmtDateTime(m.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
