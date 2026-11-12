import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { TEMPLATES, defaultBody, isTemplateKey } from "@/lib/email-defaults";
import { VARIABLES } from "@/lib/email-engine";
import { getTemplate } from "@/lib/email-store";
import { fmtDateTime } from "@/lib/labels";
import { TemplateEditor } from "./editor";

export default async function TemplateEditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isTemplateKey(key)) notFound();
  const meta = TEMPLATES[key];
  const tpl = await getTemplate(key);

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={meta.when}
        actions={<Link href="/modeles" className="btn btn-secondary">← Tous les modèles</Link>}
      />
      {tpl.customized && tpl.updated_at && <p className="-mt-3 mb-4 text-xs text-stone-500">Version modifiée le {fmtDateTime(tpl.updated_at)}.</p>}
      <TemplateEditor
        templateKey={key}
        initialSubject={tpl.subject}
        initialBody={tpl.body}
        customized={tpl.customized}
        defaultSubject={meta.subject}
        defaultBodyText={defaultBody(key)}
        variables={VARIABLES}
        needs={{ button: meta.rules.needsButton, cours: meta.rules.needsCours, coords: meta.rules.needsCoords }}
      />
    </div>
  );
}
