/*
 * Email engine: pure functions (no database, no environment).
 *
 * A template is a subject plus a body written in a small text format that
 * staff can edit on the "Modèles de courriel" page:
 *
 *   # Titre                  heading
 *   Un paragraphe            paragraph (one per line); **gras** for bold
 *   - élément                list (consecutive lines)
 *   [[Texte du bouton]]      button (its link is set by the app)
 *   > petite note            note shown under the button above it
 *   {{cours}}                the course boxes (alone on its line)
 *   {{coordonnees}}          the parent's contact box (alone on its line)
 *   ---                      small vertical space
 *   {{prenom}} ...           variables replaced when the email is built
 *
 * The body is parsed into blocks, then rendered twice: simple table-based
 * HTML (what most inboxes handle best) plus a plain-text part. Variables are
 * substituted AFTER parsing, so a child's name can never change the layout.
 */

export type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "box"; title: string; rows: [string, string][]; extra?: string[] }
  | { t: "button"; label: string; href: string; note?: string }
  | { t: "space" }
  | { t: "cours" }
  | { t: "coords" };

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

/** Variables usable as {{name}} in a subject or body. */
export const VARIABLES: { name: string; help: string; example: string }[] = [
  { name: "prenom", help: "Prénom de l'enfant", example: "Léa" },
  { name: "matieres", help: "Matières, ex. « écriture et mathématiques »", example: "écriture et mathématiques" },
  { name: "cours_phrase", help: "Ex. « les cours d'écriture et de mathématiques »", example: "les cours d'écriture et de mathématiques" },
  { name: "groupes", help: "Codes de groupe, ex. « 3-E-01, 3-M-02 »", example: "3-E-01, 3-M-02" },
  { name: "nb_cours", help: "Nombre de cours", example: "2" },
];
export const VARIABLE_NAMES = VARIABLES.map((v) => v.name);

/** Blocks that stand alone on a line and are expanded by the app. */
export const BLOCK_TOKENS = ["cours", "coordonnees"] as const;

/* ------------------------------------------------------------------ */
/* Text <-> blocks                                                     */
/* ------------------------------------------------------------------ */

const BUTTON_RE = /^\[\[(.+)\]\]$/;
const TOKEN_RE = /^\{\{\s*(cours|coordonnees)\s*\}\}$/;

export function parseBody(body: string): Block[] {
  const lines = body.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    let m: RegExpExecArray | null;
    if (line === "---") blocks.push({ t: "space" });
    else if (line.startsWith("# ")) blocks.push({ t: "h", text: line.slice(2).trim() });
    else if (line.startsWith("- ")) {
      const items = [line.slice(2).trim()];
      while (lines[i + 1]?.startsWith("- ")) items.push(lines[++i].slice(2).trim());
      blocks.push({ t: "list", items });
    } else if ((m = BUTTON_RE.exec(line))) {
      const b: Block = { t: "button", label: m[1].trim(), href: "" };
      if (lines[i + 1]?.startsWith("> ")) b.note = lines[++i].slice(2).trim();
      blocks.push(b);
    } else if ((m = TOKEN_RE.exec(line))) blocks.push({ t: m[1] === "cours" ? "cours" : "coords" });
    else blocks.push({ t: "p", text: line.startsWith("> ") ? line.slice(2).trim() : line });
  }
  return blocks;
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "h": return `# ${b.text}`;
        case "p": return b.text;
        case "list": return b.items.map((i) => `- ${i}`).join("\n");
        case "button": return `[[${b.label}]]${b.note ? `\n> ${b.note}` : ""}`;
        case "space": return "---";
        case "cours": return "{{cours}}";
        case "coords": return "{{coordonnees}}";
        case "box": return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Validation (used before saving an edited template)                  */
/* ------------------------------------------------------------------ */

export interface TemplateRules {
  needsButton: boolean;
  needsCours: boolean;
  needsCoords: boolean;
}

/** Returns a French error message, or null when the template is safe to use. */
export function validateTemplate(subject: string, body: string, rules: TemplateRules): string | null {
  if (!subject.trim()) return "L'objet du courriel est requis.";
  if (subject.length > 200) return "L'objet est trop long (200 caractères maximum).";
  if (subject.includes("\n")) return "L'objet doit tenir sur une seule ligne.";
  if (!body.trim()) return "Le contenu du courriel est vide.";
  if (body.length > 30000) return "Le contenu est trop long.";

  const allowed = new Set<string>([...VARIABLE_NAMES, ...BLOCK_TOKENS]);
  const unknown = new Set<string>();
  for (const text of [subject, body]) {
    for (const m of text.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) if (!allowed.has(m[1])) unknown.add(m[1]);
  }
  if (unknown.size) {
    return `Variable inconnue : ${[...unknown].map((u) => `{{${u}}}`).join(", ")}. Variables permises : ${VARIABLE_NAMES.map((v) => `{{${v}}}`).join(", ")}.`;
  }
  if (/\{\{\s*(cours|coordonnees)\s*\}\}/.test(subject)) return "{{cours}} et {{coordonnees}} ne peuvent pas être dans l'objet.";

  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    const t = line.trim();
    if (/\{\{\s*(cours|coordonnees)\s*\}\}/.test(t) && !TOKEN_RE.test(t)) {
      return "{{cours}} et {{coordonnees}} doivent être seuls sur leur ligne.";
    }
    if ((t.match(/\*\*/g)?.length ?? 0) % 2 === 1) return `Un passage en gras n'est pas fermé (**) : « ${t.slice(0, 60)} »`;
    if (t.startsWith("[[") && !BUTTON_RE.test(t)) return `Bouton mal formé : « ${t.slice(0, 60)} ». Format : [[Texte du bouton]]`;
  }

  const blocks = parseBody(body);
  if (rules.needsButton && !blocks.some((b) => b.t === "button")) {
    return "Ce courriel doit garder au moins un bouton (ligne [[Je confirme la réception]]), sinon les parents ne peuvent pas confirmer.";
  }
  if (rules.needsCours && !blocks.some((b) => b.t === "cours")) {
    return "Ce courriel doit contenir la ligne {{cours}}, qui affiche l'horaire et les liens de chaque cours.";
  }
  if (rules.needsCoords && !blocks.some((b) => b.t === "coords")) {
    return "Ce courriel doit contenir la ligne {{coordonnees}}, qui affiche les coordonnées du parent.";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Variables                                                           */
/* ------------------------------------------------------------------ */

export type Vars = Record<string, string>;

/** Replaces {{name}}; the values are stripped of ** so they cannot alter formatting. */
export function fill(text: string, vars: Vars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, name: string) =>
    name in vars ? vars[name].replace(/\*\*/g, "") : whole,
  );
}

function fillBlock(b: Block, vars: Vars): Block {
  switch (b.t) {
    case "h":
    case "p": return { ...b, text: fill(b.text, vars) };
    case "list": return { ...b, items: b.items.map((i) => fill(i, vars)) };
    case "button": return { ...b, label: fill(b.label, vars), note: b.note ? fill(b.note, vars) : undefined };
    default: return b;
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const BRAND = "#c4600b";
const INK = "#1c1917";
const MUTED = "#57534e";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:${BRAND};word-break:break-all;">${u}</a>`);
  out = out.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+)/g, (_m, pre, mail) => `${pre}<a href="mailto:${mail}" style="color:${BRAND};">${mail}</a>`);
  return out;
}

const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

function renderHtml(blocks: Block[], preheader: string, logoUrl: string): string {
  const body = blocks
    .map((b) => {
      switch (b.t) {
        case "h":
          return `<h2 style="margin:28px 0 10px;font-size:18px;line-height:1.35;color:${INK};font-weight:700;">${inline(b.text)}</h2>`;
        case "p":
          return `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${INK};">${inline(b.text)}</p>`;
        case "list":
          return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">${b.items
            .map((i) => `<tr><td style="padding:3px 0;font-size:16px;line-height:1.55;color:${INK};">${inline(i)}</td></tr>`)
            .join("")}</table>`;
        case "box":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;background:#fff7ee;border:1px solid #f6dcc0;border-radius:8px;">
<tr><td style="padding:16px 18px;">
<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:${INK};">${inline(b.title)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${b.rows
            .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;font-size:15px;color:${MUTED};white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:3px 0;font-size:15px;color:${INK};font-weight:600;">${inline(v)}</td></tr>`)
            .join("")}</table>${(b.extra ?? []).map((e) => `<p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:${INK};">${inline(e)}</p>`).join("")}
</td></tr></table>`;
        case "button":
          return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 ${b.note ? 6 : 18}px;">
<tr><td style="border-radius:6px;background:${BRAND};"><a href="${esc(b.href)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(b.label)}</a></td></tr></table>${
            b.note ? `<p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:${MUTED};">${inline(b.note)}</p>` : ""
          }`;
        case "space":
          return `<div style="height:8px;line-height:8px;">&nbsp;</div>`;
        default:
          return "";
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Éducation Futée</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:20px 28px 14px;border-bottom:3px solid #f5c400;"><img src="${esc(logoUrl)}" width="120" alt="Éducation Futée" style="display:block;width:120px;height:auto;border:0;font-size:18px;font-weight:700;color:${BRAND};"></td></tr>
<tr><td style="padding:8px 28px 26px;">
${body}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.5;color:${MUTED};">Éducation Futée · info@educationfutee.com<br>Vous recevez ce courriel à la suite de l'inscription de votre enfant.</td></tr>
</table></td></tr></table></body></html>`;
}

function renderText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "h": return `\n${plain(b.text).toUpperCase()}\n`;
        case "p": return plain(b.text) + "\n";
        case "list": return b.items.map((i) => `  ${plain(i)}`).join("\n") + "\n";
        case "box": return `${plain(b.title)}\n${b.rows.map(([k, v]) => `  ${k} ${plain(v)}`).join("\n")}${(b.extra ?? []).map((e) => `\n  ${plain(e)}`).join("")}\n`;
        case "button": return `${b.label} : ${b.href}\n${b.note ? plain(b.note) + "\n" : ""}`;
        default: return "";
      }
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface RenderInput {
  subject: string;
  body: string;
  preheader: string;
  vars: Vars;
  /** Link behind every [[button]] of the body. */
  buttonUrl: string;
  /** Boxes that replace {{cours}} / {{coordonnees}}. */
  coursBoxes: Block[];
  coordsBox: Block | null;
  logoUrl: string;
}

export function renderEmail(input: RenderInput): RenderedEmail {
  const blocks: Block[] = [];
  for (const raw of parseBody(input.body)) {
    if (raw.t === "cours") blocks.push(...input.coursBoxes);
    else if (raw.t === "coords") {
      if (input.coordsBox) blocks.push(input.coordsBox);
    } else {
      const b = fillBlock(raw, input.vars);
      blocks.push(b.t === "button" ? { ...b, href: input.buttonUrl } : b);
    }
  }
  const subject = fill(input.subject, input.vars).replace(/\s+/g, " ").trim();
  const preheader = fill(input.preheader, input.vars);
  return { subject, preheader, html: renderHtml(blocks, preheader, input.logoUrl), text: renderText(blocks) };
}
