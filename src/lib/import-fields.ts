/**
 * Columns accepted by the bulk import. Shared by the parser and by the page
 * that shows staff which fields are required (so the two can never disagree).
 */

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  help: string;
  example: string;
  /** Other header spellings accepted (compared without accents, case or punctuation). */
  aliases: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: "prenom_enfant", label: "Prénom de l'enfant", required: true, help: "Prénom de l'élève.", example: "Léa", aliases: ["prenom", "enfant", "eleve", "prenomeleve"] },
  { key: "courriel_parent", label: "Courriel du parent", required: true, help: "Une adresse courriel valide. Deux enfants avec le même courriel sont ajoutés à la même famille.", example: "marie@exemple.com", aliases: ["courriel", "email", "courrielparent", "emailparent", "adressecourriel"] },
  { key: "groupes", label: "Groupe(s)", required: true, help: "Code(s) de groupe existants et actifs. Si l'enfant a plusieurs matières, séparez les codes par un « + ». Un seul groupe par matière.", example: "3-E-01 + 3-M-02", aliases: ["groupe", "codegroupe", "codesgroupe", "codesdegroupe", "codedegroupe"] },
  { key: "nom_parent", label: "Nom du parent", required: false, help: "Nom complet du parent.", example: "Marie Tremblay", aliases: ["parent", "nomparent", "nomduparent"] },
  { key: "telephone_parent", label: "Téléphone du parent", required: false, help: "Utilisé pour l'appel de suivi.", example: "514 555-0123", aliases: ["telephone", "tel", "cellulaire", "telephoneparent"] },
  { key: "cycle", label: "Cycle", required: false, help: "2 ou 3. S'il est vide, il est déduit du groupe. Doit correspondre au groupe.", example: "3", aliases: ["cycles"] },
  { key: "niveau", label: "Niveau scolaire", required: false, help: "Ex. : 3e année, 4e année, 5e année, 6e année.", example: "5e année", aliases: ["niveauscolaire", "annee", "grade"] },
  { key: "date_debut", label: "Début du programme", required: false, help: "Format AAAA-MM-JJ ou JJ/MM/AAAA.", example: "2026-09-08", aliases: ["debut", "datedebut", "datededebut", "datedebutprogramme", "debutduprogramme"] },
  { key: "date_fin", label: "Fin du programme", required: false, help: "Format AAAA-MM-JJ ou JJ/MM/AAAA.", example: "2027-06-15", aliases: ["fin", "datefin", "datedefin", "datefinprogramme", "finduprogramme"] },
  { key: "conseillere", label: "Conseillère", required: false, help: "Prénom de la personne qui a fait l'inscription.", example: "Sandra", aliases: ["conseiller", "closer", "inscritpar"] },
  { key: "type_paiement", label: "Type de paiement", required: false, help: "« mensuel » ou « unique ». Si indiqué, le montant est obligatoire.", example: "mensuel", aliases: ["paiement", "typedepaiement", "modepaiement"] },
  { key: "montant", label: "Montant ($)", required: false, help: "En dollars canadiens, par mois ou au total. Ex. : 149,00.", example: "149,00", aliases: ["montantpaiement", "prix", "tarif"] },
  { key: "statut", label: "Statut de l'abonnement", required: false, help: "actif, en pause ou terminé. Vide = actif.", example: "actif", aliases: ["statutabonnement", "abonnement", "status"] },
  { key: "notes", label: "Notes", required: false, help: "Texte libre.", example: "Préfère les cours du soir", aliases: ["note", "commentaire", "commentaires"] },
];

export const REQUIRED_FIELDS = IMPORT_FIELDS.filter((f) => f.required);

/** "Prénom de l'enfant" -> "prenomdelenfant" */
export const normalizeHeader = (h: string) =>
  h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps a header cell to a field key, or null if unknown. */
export function fieldForHeader(header: string): string | null {
  const n = normalizeHeader(header);
  if (!n) return null;
  for (const f of IMPORT_FIELDS) {
    if (n === normalizeHeader(f.key) || n === normalizeHeader(f.label) || f.aliases.includes(n)) return f.key;
  }
  return null;
}

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 900_000;

/** Header row of the downloadable template (";" delimiter opens correctly in French-Canadian Excel). */
export const templateCsv = () =>
  "﻿" + IMPORT_FIELDS.map((f) => f.label + (f.required ? " *" : "")).join(";") + "\r\n";
