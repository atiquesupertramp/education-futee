"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { previewImportAction, runImportAction, type ImportState } from "@/app/actions";

const STATE_STYLE = {
  ok: { label: "Prêt", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  erreur: { label: "Erreur", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
  doublon: { label: "Doublon", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
} as const;

export function Importer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewedFile, setPreviewedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<"confirme" | "en_attente">("confirme");
  const [previewState, previewAction, previewing] = useActionState<ImportState, FormData>(previewImportAction, undefined);
  const [runState, runAction, running] = useActionState<ImportState, FormData>(runImportAction, undefined);

  const build = () => {
    const fd = new FormData();
    if (file) fd.set("file", file);
    fd.set("import_status", importStatus);
    return fd;
  };
  const check = () => {
    setPreviewedFile(file);
    startTransition(() => previewAction(build()));
  };
  const doImport = () => startTransition(() => runAction(build()));

  const preview = previewedFile === file ? previewState?.preview : undefined;
  const result = runState?.result;
  const error = result ? undefined : (previewedFile === file ? previewState?.error : undefined) ?? runState?.error;

  if (result) {
    return (
      <section className="card p-6" role="status">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{result.imported} élève{result.imported > 1 ? "s" : ""} importé{result.imported > 1 ? "s" : ""}</h2>
            <p className="text-sm text-stone-500">Aucun courriel ni SMS n&apos;a été envoyé.</p>
          </div>
        </div>
        {[
          { title: "Ignorés", rows: result.skipped, tone: "text-amber-800" },
          { title: "Échecs", rows: result.failed, tone: "text-rose-800" },
        ].map(
          (g) =>
            g.rows.length > 0 && (
              <div key={g.title} className="mt-4">
                <h3 className={`mb-1 text-sm font-semibold ${g.tone}`}>{g.title} ({g.rows.length})</h3>
                <ul className="space-y-1 text-sm text-stone-700">
                  {g.rows.map((r) => (
                    <li key={r.line}>Ligne {r.line} · {r.label} : {r.message}</li>
                  ))}
                </ul>
              </div>
            ),
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/eleves" className="btn btn-primary">Voir les élèves</Link>
          {/* Plain link on purpose: a full page load resets the form. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/eleves/import" className="btn btn-secondary">Importer un autre fichier</a>
        </div>
      </section>
    );
  }

  return (
    <section className="card space-y-5 p-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">1. Choisissez votre fichier</h2>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          aria-label="Fichier CSV"
          className="mt-3 block w-full cursor-pointer rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-700 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white hover:bg-stone-100"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-[15px] font-semibold tracking-tight">2. Dans quel état arrivent ces élèves?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["confirme", "Déjà intégrés (recommandé)", "Les matières sont marquées « Confirmé ». Aucune relance ne sera jamais envoyée à ces familles."],
            ["en_attente", "À contacter plus tard", "Les matières sont « En attente d'envoi ». Rien ne part : vous pourrez envoyer le courriel de bienvenue depuis la fiche de chaque élève."],
          ] as const).map(([v, title, text]) => (
            <label key={v} className={`flex cursor-pointer gap-3 rounded-xl p-4 ring-1 transition ${importStatus === v ? "bg-brand-50 ring-brand-600" : "bg-white ring-stone-200 hover:bg-stone-50"}`}>
              <input type="radio" name="import_status" value={v} checked={importStatus === v} onChange={() => setImportStatus(v)} className="mt-1 accent-brand-700" />
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-sm text-stone-600">{text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <button type="button" className="btn btn-primary" disabled={!file || previewing || running} onClick={check}>
          {previewing ? "Vérification…" : "3. Vérifier le fichier"}
        </button>
        <span className="ml-3 text-sm text-stone-500">Rien n&apos;est enregistré à cette étape.</span>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>
      )}

      {preview && (
        <div className="space-y-4 border-t border-stone-100 pt-5">
          <div className="flex flex-wrap gap-2 text-sm font-medium">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 ring-1 ring-emerald-200">{preview.ok} prêt{preview.ok > 1 ? "s" : ""}</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800 ring-1 ring-rose-200">{preview.errors} erreur{preview.errors > 1 ? "s" : ""}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800 ring-1 ring-amber-200">{preview.duplicates} doublon{preview.duplicates > 1 ? "s" : ""}</span>
          </div>
          {preview.ignoredColumns.length > 0 && (
            <p className="text-sm text-stone-500">Colonnes non reconnues, ignorées : {preview.ignoredColumns.join(", ")}.</p>
          )}
          <div className="max-h-[420px] overflow-auto rounded-xl ring-1 ring-stone-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-stone-50">
                <tr>
                  <th className="th">Ligne</th>
                  <th className="th">Élève</th>
                  <th className="th">Groupes</th>
                  <th className="th">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {preview.rows.map((r) => (
                  <tr key={r.line} className={r.state === "ok" ? "" : "bg-stone-50/60"}>
                    <td className="td tabular-nums text-stone-500">{r.line}</td>
                    <td className="td">{r.label}</td>
                    <td className="td font-mono text-xs">{r.codes.join(", ")}</td>
                    <td className="td">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATE_STYLE[r.state].cls}`}>{STATE_STYLE[r.state].label}</span>
                      {r.message && <div className="mt-1 text-xs text-stone-600">{r.message}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.ok > 0 ? (
            <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <p className="mb-3 text-sm text-stone-700">
                <strong>{preview.ok} élève{preview.ok > 1 ? "s" : ""}</strong> sera{preview.ok > 1 ? "ont" : ""} ajouté{preview.ok > 1 ? "s" : ""}.
                {preview.errors + preview.duplicates > 0 && ` Les ${preview.errors + preview.duplicates} autres lignes seront ignorées (corrigez le fichier et revérifiez si vous voulez les inclure).`} Aucun courriel ni SMS ne sera envoyé.
              </p>
              <button type="button" className="btn btn-primary" disabled={running} onClick={doImport}>
                {running ? "Import en cours…" : `Importer ${preview.ok} élève${preview.ok > 1 ? "s" : ""}`}
              </button>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">Aucune ligne n&apos;est prête à être importée. Corrigez les erreurs dans votre fichier, puis choisissez-le à nouveau.</p>
          )}
        </div>
      )}
    </section>
  );
}
