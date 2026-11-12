/** Minimal RFC 4180 CSV parser. Pure, no dependencies. */

/** Picks the delimiter used by the header line: Excel in French Canada writes ";", others "," or tab. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;
  for (const d of [";", ",", "\t"]) {
    let inQuotes = false;
    let n = 0;
    for (const ch of firstLine) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) n++;
    }
    if (n > bestCount) {
      best = d;
      bestCount = n;
    }
  }
  return best;
}

/**
 * Parses CSV text into rows of cells. Handles a UTF-8 BOM, quoted cells with
 * embedded delimiters, quotes ("") and line breaks, and CRLF / LF / CR endings.
 * Completely empty lines are dropped. Throws on an unclosed quote.
 */
export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let touched = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (touched || row.some((c) => c !== "")) rows.push(row);
    row = [];
    touched = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      touched = true;
    } else if (ch === delimiter) {
      endCell();
      touched = true;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      cell += ch;
      touched = true;
    }
  }
  if (inQuotes) throw new Error("Un guillemet n'est pas fermé dans le fichier. Vérifiez qu'une cellule n'est pas restée ouverte.");
  if (cell !== "" || row.length > 0 || touched) endRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
