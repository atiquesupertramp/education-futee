import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import { TEMPLATES, TEMPLATE_KEYS } from "@/lib/email-defaults";
import { customizedKeys } from "@/lib/email-store";
import { fmtDateTime } from "@/lib/labels";

export default async function TemplatesPage() {
  const custom = await customizedKeys().catch(() => new Map<string, string>());
  return (
    <div>
      <PageHeader
        title="Modèles de courriel"
        subtitle="Modifiez le texte des courriels envoyés aux parents. Une fois enregistré, le nouveau texte est utilisé pour tous les prochains envois. Les courriels déjà envoyés ne changent pas."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {TEMPLATE_KEYS.map((k) => {
          const t = TEMPLATES[k];
          const at = custom.get(k);
          return (
            <Link key={k} href={`/modeles/${k}`} className="card group flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:ring-stone-300">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold tracking-tight group-hover:text-brand-700">{t.title}</h2>
                {at ? <Pill tone="brand">Modifié</Pill> : <Pill>Modèle par défaut</Pill>}
              </div>
              <p className="text-sm text-stone-500">{t.when}</p>
              <p className="mt-auto pt-2 text-xs text-stone-400">{at ? `Dernière modification : ${fmtDateTime(at)}` : "Jamais modifié"}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
