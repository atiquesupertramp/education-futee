"use client";

import { useActionState, useRef, useState } from "react";
import { previewTemplateAction, resetTemplateAction, saveTemplateAction, type TemplateState } from "@/app/actions";

interface Props {
  templateKey: string;
  initialSubject: string;
  initialBody: string;
  customized: boolean;
  defaultSubject: string;
  defaultBodyText: string;
  variables: { name: string; help: string; example: string }[];
  needs: { button: boolean; cours: boolean; coords: boolean };
}

export function TemplateEditor({ templateKey, initialSubject, initialBody, customized, defaultSubject, defaultBodyText, variables, needs }: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const area = useRef<HTMLTextAreaElement>(null);

  const [saveState, save, saving] = useActionState<TemplateState, FormData>(saveTemplateAction, undefined);
  const [previewState, preview, previewing] = useActionState<TemplateState, FormData>(previewTemplateAction, undefined);
  const [resetState, reset, resetting] = useActionState<TemplateState, FormData>(async (prev, fd) => {
    const r = await resetTemplateAction(prev, fd);
    if (r?.saved && r.body && r.subject) {
      setSubject(r.subject);
      setBody(r.body);
    }
    return r;
  }, undefined);

  const error = [saveState, previewState, resetState].find((s) => s?.error)?.error;
  const saved = !error && (saveState?.saved || resetState?.saved);
  const dirty = subject !== initialSubject || body !== initialBody;

  const insert = (text: string) => {
    const el = area.current;
    if (!el) return setBody((b) => b + (b.endsWith("\n") || !b ? "" : "\n") + text);
    const { selectionStart: a, selectionEnd: z } = el;
    const next = body.slice(0, a) + text + body.slice(z);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + text.length, a + text.length);
    });
  };
  const insertLine = (text: string) => insert((body && !body.endsWith("\n") ? "\n\n" : "") + text);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <div className="space-y-5">
        <form action={save} className="card space-y-4 p-5">
          <input type="hidden" name="key" value={templateKey} />
          <div>
            <label className="label" htmlFor="subject">Objet du courriel</label>
            <input id="subject" name="subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="label !mb-0" htmlFor="body">Contenu</label>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="btn btn-secondary px-2 py-1 text-xs" onClick={() => insertLine("# Titre de section")}>+ Titre</button>
                <button type="button" className="btn btn-secondary px-2 py-1 text-xs" onClick={() => insertLine("Nouveau paragraphe")}>+ Paragraphe</button>
                <button type="button" className="btn btn-secondary px-2 py-1 text-xs" onClick={() => insertLine("- Premier élément\n- Deuxième élément")}>+ Liste</button>
                <button type="button" className="btn btn-secondary px-2 py-1 text-xs" onClick={() => insertLine("[[Texte du bouton]]")}>+ Bouton</button>
              </div>
            </div>
            <textarea
              id="body"
              name="body"
              ref={area}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={26}
              spellCheck
              required
              className="input font-mono text-[13px] leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="mr-1 self-center text-xs font-medium text-stone-500">Insérer :</span>
            {variables.map((v) => (
              <button key={v.name} type="button" title={`${v.help} (ex. ${v.example})`} className="chip chip-off cursor-pointer font-mono text-xs" onClick={() => insert(`{{${v.name}}}`)}>
                {`{{${v.name}}}`}
              </button>
            ))}
            {needs.cours && (
              <button type="button" title="Une boîte par cours : groupe, enseignante, horaire, lien Zoom" className="chip chip-off cursor-pointer font-mono text-xs" onClick={() => insertLine("{{cours}}")}>
                {"{{cours}}"}
              </button>
            )}
            {needs.coords && (
              <button type="button" title="Nom, courriel et téléphone du parent" className="chip chip-off cursor-pointer font-mono text-xs" onClick={() => insertLine("{{coordonnees}}")}>
                {"{{coordonnees}}"}
              </button>
            )}
          </div>

          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}
          {saved && !dirty && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">Enregistré. Ce texte sera utilisé pour tous les prochains courriels de ce type.</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            <button type="submit" formAction={preview} className="btn btn-secondary" disabled={previewing}>{previewing ? "Aperçu…" : "Voir l'aperçu"}</button>
            {dirty && <span className="text-xs text-amber-700">Modifications non enregistrées</span>}
          </div>
        </form>

        {(customized || subject !== defaultSubject || body !== defaultBodyText) && (
          <form
            action={reset}
            onSubmit={(e) => {
              if (!window.confirm("Restaurer le modèle d'origine? Votre version modifiée sera supprimée.")) e.preventDefault();
            }}
            className="card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <input type="hidden" name="key" value={templateKey} />
            <p className="text-sm text-stone-600">Revenir au texte d&apos;origine fourni avec l&apos;application.</p>
            <button className="btn btn-danger" disabled={resetting}>{resetting ? "Restauration…" : "Restaurer le modèle d'origine"}</button>
          </form>
        )}
      </div>

      <div className="space-y-5">
        <section className="card overflow-hidden">
          <h2 className="card-title">Aperçu avec des données d&apos;exemple</h2>
          {previewState?.previewHtml ? (
            <>
              <div className="border-b border-stone-100 bg-stone-50 px-5 py-2 text-sm">
                <span className="text-stone-500">Objet : </span>
                <strong>{previewState.previewSubject}</strong>
              </div>
              <iframe title="Aperçu du courriel" sandbox="" srcDoc={previewState.previewHtml} className="h-[640px] w-full bg-white" />
            </>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-stone-500">Cliquez sur « Voir l&apos;aperçu » pour voir le courriel tel que le parent le recevra, sans enregistrer.</p>
          )}
        </section>

        <section className="card p-5 text-sm">
          <h2 className="mb-2 font-semibold">Comment écrire le contenu</h2>
          <ul className="space-y-1.5 text-stone-600">
            <li><code className="rounded bg-stone-100 px-1">Une ligne</code> = un paragraphe</li>
            <li><code className="rounded bg-stone-100 px-1"># Titre</code> = titre de section</li>
            <li><code className="rounded bg-stone-100 px-1">- élément</code> = liste (une ligne par élément)</li>
            <li><code className="rounded bg-stone-100 px-1">**gras**</code> = texte en gras</li>
            <li><code className="rounded bg-stone-100 px-1">[[Je confirme la réception]]</code> = bouton</li>
            <li><code className="rounded bg-stone-100 px-1">&gt; note</code> sous un bouton = petite note</li>
            <li><code className="rounded bg-stone-100 px-1">---</code> = petit espace</li>
          </ul>
          <h3 className="mt-4 mb-1 font-semibold">Remplacés automatiquement</h3>
          <ul className="space-y-1 text-stone-600">
            {variables.map((v) => (
              <li key={v.name}><code className="rounded bg-stone-100 px-1">{`{{${v.name}}}`}</code> {v.help}</li>
            ))}
            {needs.cours && <li><code className="rounded bg-stone-100 px-1">{"{{cours}}"}</code> une boîte par cours (groupe, enseignante, horaire, Zoom). Seul sur sa ligne, obligatoire.</li>}
            {needs.coords && <li><code className="rounded bg-stone-100 px-1">{"{{coordonnees}}"}</code> coordonnées du parent. Seul sur sa ligne, obligatoire.</li>}
          </ul>
          {needs.button && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">Gardez au moins un bouton de confirmation : sans lui, les parents ne peuvent pas confirmer. Le lien du bouton est ajouté automatiquement.</p>}
        </section>
      </div>
    </div>
  );
}
