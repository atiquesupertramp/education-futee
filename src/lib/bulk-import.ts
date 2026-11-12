import "server-only";
import { db, must } from "./db";
import { parseCsv } from "./csv";
import { IMPORT_FIELDS, MAX_IMPORT_ROWS, REQUIRED_FIELDS, fieldForHeader } from "./import-fields";
import { checkGroupChoice, checkPayment, createStudent, type NewStudentInput } from "./onboarding";
import { parseGroupCode } from "./labels";
import type { Group, PaymentType, Student } from "./types";

/*
 * Bulk import of students from a CSV file.
 *
 * Two steps, both done on the server from the same file: prepareImport()
 * validates every row without writing anything (the preview), runImport()
 * validates again and then writes. The import NEVER sends an email or an SMS
 * and never starts a follow-up timer (see EnrollOptions in onboarding.ts).
 */

export type RowState = "ok" | "erreur" | "doublon";

export interface PreparedRow {
  /** Line in the file (header = line 1). */
  line: number;
  label: string;
  codes: string[];
  email: string;
  state: RowState;
  message?: string;
  input?: NewStudentInput;
}

export interface Prepared {
  fatal?: string;
  rows: PreparedRow[];
  /** Header cells that were not recognised (ignored). */
  ignoredColumns: string[];
}

/** Excel often saves CSV as Windows-1252: try UTF-8 first, then fall back. */
export function decodeFile(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

function parseDate(raw: string): { value: string | null; error?: string } {
  const v = raw.trim();
  if (!v) return { value: null };
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return { value: null, error: `date invalide « ${v} » (format AAAA-MM-JJ ou JJ/MM/AAAA)` };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return { value: null, error: `date inexistante « ${v} »` };
  return { value: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

const plainLower = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function parseMoney(raw: string): number | null {
  const v = raw.replace(/\s|\$|cad/gi, "").replace(",", ".");
  if (!v) return null;
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
}

export async function prepareImport(text: string): Promise<Prepared> {
  let table: string[][];
  try {
    table = parseCsv(text);
  } catch (e) {
    return { fatal: e instanceof Error ? e.message : "Fichier illisible.", rows: [], ignoredColumns: [] };
  }
  if (table.length === 0) return { fatal: "Le fichier est vide.", rows: [], ignoredColumns: [] };

  const header = table[0];
  const col = new Map<string, number>();
  const ignored: string[] = [];
  header.forEach((h, i) => {
    const key = fieldForHeader(h);
    if (key && !col.has(key)) col.set(key, i);
    else if (h.trim()) ignored.push(h.trim());
  });
  const missing = REQUIRED_FIELDS.filter((f) => !col.has(f.key));
  if (missing.length) {
    return {
      fatal: `Colonne obligatoire manquante : ${missing.map((f) => `« ${f.label} »`).join(", ")}. Colonnes trouvées : ${header.map((h) => h.trim()).filter(Boolean).join(", ") || "aucune"}. Téléchargez le modèle pour obtenir les bons titres.`,
      rows: [],
      ignoredColumns: ignored,
    };
  }
  const dataRows = table.slice(1);
  if (dataRows.length === 0) return { fatal: "Le fichier ne contient que la ligne de titres : aucune ligne d'élève.", rows: [], ignoredColumns: ignored };
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { fatal: `Le fichier contient ${dataRows.length} lignes. Maximum : ${MAX_IMPORT_ROWS} élèves par import. Divisez le fichier en plusieurs parties.`, rows: [], ignoredColumns: ignored };
  }

  const groups = must(await db().from("groups").select("*"), "Groupes") as Group[];
  const existing = must(await db().from("students").select("first_name, family:families(parent_email)"), "Élèves existants") as unknown as {
    first_name: string;
    family: { parent_email: string } | null;
  }[];
  const known = new Set(existing.map((s) => `${(s.family?.parent_email ?? "").toLowerCase()}|${plainLower(s.first_name)}`));
  const seenInFile = new Map<string, number>();

  const rows: PreparedRow[] = dataRows.map((cells, idx) => {
    const line = idx + 2;
    const get = (key: string) => (cells[col.get(key) ?? -1] ?? "").trim();
    const first = get("prenom_enfant");
    const email = get("courriel_parent").toLowerCase();
    const codes = [...new Set(get("groupes").split(/\s+et\s+|[;,+|/\s]+/i).map((c) => c.trim().toUpperCase()).filter(Boolean))];
    const errors: string[] = [];

    if (!first) errors.push("prénom de l'enfant manquant");
    if (!email) errors.push("courriel du parent manquant");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`courriel invalide « ${email} »`);
    if (codes.length === 0) errors.push("aucun groupe indiqué");
    for (const c of codes) if (!parseGroupCode(c)) errors.push(`code de groupe invalide « ${c} »`);

    // Cycle: optional, deduced from the group.
    let cycle: 2 | 3 | null = null;
    const rawCycle = get("cycle");
    if (rawCycle) {
      const m = /^\D*([23])\D*$/.exec(rawCycle);
      if (m) cycle = Number(m[1]) as 2 | 3;
      else errors.push(`cycle invalide « ${rawCycle} » (2 ou 3)`);
    } else {
      const g = groups.find((x) => x.code === codes[0]);
      if (g) cycle = g.cycle;
    }
    if (cycle && codes.every((c) => parseGroupCode(c))) {
      const err = checkGroupChoice(codes, cycle, groups);
      if (err) errors.push(err.replace(/\.$/, ""));
    }

    const start = parseDate(get("date_debut"));
    const end = parseDate(get("date_fin"));
    if (start.error) errors.push(`début : ${start.error}`);
    if (end.error) errors.push(`fin : ${end.error}`);
    if (start.value && end.value && end.value < start.value) errors.push("la date de fin est avant la date de début");

    let payment_type: PaymentType | null = null;
    const rawType = plainLower(get("type_paiement"));
    if (rawType) {
      if (rawType.startsWith("mens")) payment_type = "mensuel";
      else if (rawType.startsWith("uni")) payment_type = "unique";
      else errors.push(`type de paiement invalide « ${get("type_paiement")} » (mensuel ou unique)`);
    }
    const amount = parseMoney(get("montant"));
    if (amount !== null && Number.isNaN(amount)) errors.push(`montant invalide « ${get("montant")} »`);
    else if (!errors.some((e) => e.startsWith("type de paiement"))) {
      const err = checkPayment(payment_type, amount);
      if (err) errors.push(err.replace(/\.$/, "").toLowerCase());
    }

    let membership: Student["membership_status"] = "actif";
    const rawStatus = plainLower(get("statut")).replace(/[\s_-]+/g, "");
    if (rawStatus) {
      if (rawStatus === "actif") membership = "actif";
      else if (rawStatus === "enpause" || rawStatus === "pause") membership = "en_pause";
      else if (rawStatus === "termine" || rawStatus === "fini") membership = "termine";
      else errors.push(`statut invalide « ${get("statut")} » (actif, en pause ou terminé)`);
    }

    const label = [first, email].filter(Boolean).join(" · ") || `(ligne ${line})`;
    if (errors.length) return { line, label, codes, email, state: "erreur" as const, message: errors.join("; ") };

    const dupKey = `${email}|${plainLower(first)}`;
    if (known.has(dupKey)) return { line, label, codes, email, state: "doublon" as const, message: "Cet élève existe déjà (même courriel de parent et même prénom) : ignoré." };
    const firstSeen = seenInFile.get(dupKey);
    if (firstSeen) return { line, label, codes, email, state: "doublon" as const, message: `Déjà présent à la ligne ${firstSeen} du fichier : ignoré.` };
    seenInFile.set(dupKey, line);

    const input: NewStudentInput = {
      parent_name: get("nom_parent"),
      parent_email: email,
      parent_phone: get("telephone_parent"),
      first_name: first,
      grade: get("niveau"),
      cycle: cycle!,
      start_date: start.value ?? "",
      end_date: end.value ?? "",
      closer_name: get("conseillere"),
      group_codes: codes,
      payment_type,
      payment_amount: payment_type ? amount : null,
      membership_status: membership,
      notes: get("notes"),
    };
    return { line, label, codes, email, state: "ok" as const, input };
  });

  return { rows, ignoredColumns: ignored };
}

export interface ImportResult {
  fatal?: string;
  imported: number;
  skipped: { line: number; label: string; message: string }[];
  failed: { line: number; label: string; message: string }[];
}

/** Writes every valid row. Rows with errors or duplicates are skipped; one bad row never stops the others. */
export async function runImport(text: string, importStatus: "confirme" | "en_attente"): Promise<ImportResult> {
  const prepared = await prepareImport(text);
  if (prepared.fatal) return { fatal: prepared.fatal, imported: 0, skipped: [], failed: [] };

  const result: ImportResult = { imported: 0, skipped: [], failed: [] };
  for (const row of prepared.rows) {
    if (row.state !== "ok" || !row.input) {
      result.skipped.push({ line: row.line, label: row.label, message: row.message ?? "Ignoré." });
      continue;
    }
    try {
      await createStudent(row.input, { welcome: false, importStatus });
      result.imported++;
    } catch (e) {
      result.failed.push({ line: row.line, label: row.label, message: e instanceof Error ? e.message : "Erreur inconnue." });
    }
  }
  return result;
}

export const FIELD_COUNT = IMPORT_FIELDS.length;
