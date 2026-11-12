import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IMPORT_FIELDS, MAX_IMPORT_ROWS } from "@/lib/import-fields";
import { Importer } from "./importer";

export const metadata = { title: "Importer des élèves · Éducation Futée" };

export default function ImportPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Importer des élèves"
        subtitle="Ajoutez plusieurs élèves d'un coup à partir d'un fichier CSV (Excel ou Google Sheets)."
        actions={<Link href="/eleves" className="btn btn-secondary">← Tous les élèves</Link>}
      />

      <div className="mb-6 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
        <span aria-hidden className="text-lg">✓</span>
        <p>
          <strong>L&apos;import n&apos;envoie rien.</strong> Aucun courriel de bienvenue, aucun rappel, aucun SMS et aucune alerte à l&apos;adjointe : les élèves sont seulement ajoutés à la base de données. Vous verrez un aperçu complet avant que quoi que ce soit soit enregistré.
        </p>
      </div>

      <section className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold tracking-tight">Champs du fichier</h2>
          <a href="/eleves/import/modele.csv" className="btn btn-secondary" download>↓ Télécharger le modèle (CSV)</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-stone-50/70">
              <tr>
                <th className="th">Colonne</th>
                <th className="th">Obligatoire</th>
                <th className="th">Ce qu&apos;il faut y mettre</th>
                <th className="th">Exemple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {IMPORT_FIELDS.map((f) => (
                <tr key={f.key}>
                  <td className="td font-semibold">{f.label}</td>
                  <td className="td">
                    {f.required ? (
                      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200 ring-inset">Obligatoire</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200 ring-inset">Facultatif</span>
                    )}
                  </td>
                  <td className="td text-stone-600">{f.help}</td>
                  <td className="td font-mono text-xs">{f.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-1.5 border-t border-stone-100 px-5 py-4 text-sm text-stone-600">
          <li>• Une ligne par enfant. La première ligne contient les titres des colonnes (utilisez le modèle).</li>
          <li>• Les groupes doivent déjà exister et être actifs (page Groupes). Maximum {MAX_IMPORT_ROWS} élèves par fichier.</li>
          <li>• Dans Excel : Fichier, Enregistrer sous, « CSV UTF-8 ». Les séparateurs « ; » et « , » sont reconnus.</li>
          <li>• Un élève déjà inscrit (même courriel de parent et même prénom) est ignoré, donc importer deux fois le même fichier ne crée pas de doublons.</li>
        </ul>
      </section>

      <Importer />
    </div>
  );
}
