import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/onboarding";
import { PageHeader, Pill } from "@/components/ui";
import { fmtDateTime, messageKindLabel } from "@/lib/labels";
import type { Message } from "@/lib/types";

export default async function MessagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vue?: string }> }) {
  const { id } = await params;
  const { vue = "html" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = (await db().from("messages").select("*, student:students(id, first_name)").eq("id", id).maybeSingle()).data as (Message & { student: { id: string; first_name: string } | null }) | null;
  if (!m) notFound();
  const settings = await getSettings();
  const isSms = m.channel === "sms";

  return (
    <div>
      <PageHeader
        title={isSms ? "SMS" : m.subject ?? "Courriel"}
        subtitle={<Pill tone="amber">Simulé : non envoyé (mode démo)</Pill>}
        actions={m.student && <Link href={`/eleves/${m.student.id}`} className="btn btn-secondary">← Fiche de {m.student.first_name}</Link>}
      />
      <div className="card mb-4 grid gap-x-8 gap-y-1 p-4 text-sm sm:grid-cols-2">
        {!isSms && <div><span className="text-stone-500">De :</span> Éducation Futée &lt;{settings.sender_email}&gt;</div>}
        <div><span className="text-stone-500">À :</span> {m.to_address}</div>
        {!isSms && <div><span className="text-stone-500">Répondre à :</span> {settings.reply_to}</div>}
        <div><span className="text-stone-500">Type :</span> {messageKindLabel[m.kind] ?? m.kind}</div>
        <div><span className="text-stone-500">Date :</span> {fmtDateTime(m.sent_at)}</div>
      </div>

      {isSms ? (
        <div className="max-w-sm rounded-2xl bg-stone-200 p-4">
          <div className="rounded-2xl rounded-bl-sm bg-white p-3 text-sm leading-relaxed shadow-sm">{m.body_text}</div>
          <div className="mt-2 text-xs text-stone-500">{(m.body_text ?? "").length} caractères</div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            {[["html", "Aperçu"], ["texte", "Version texte"]].map(([k, l]) => (
              <Link key={k} href={`/messages/${m.id}?vue=${k}`} className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${vue === k ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300"}`}>{l}</Link>
            ))}
          </div>
          {vue === "texte" ? (
            <pre className="card overflow-x-auto p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap">{m.body_text}</pre>
          ) : (
            <iframe title="Aperçu du courriel" srcDoc={m.body_html ?? ""} className="h-[78vh] w-full rounded-lg bg-white ring-1 ring-stone-200" />
          )}
        </>
      )}
    </div>
  );
}
