/**
 * CSV para abrir no Excel em português: separador `;`, BOM para os acentos e quebra de linha CRLF.
 * Texto que começaria com `=`, `+`, `-`, `@`, tab ou CR ganha um apóstrofo na frente, para o Excel não
 * executá-lo como fórmula (injeção de CSV). Números ficam como estão.
 */

export type CsvCell = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[";,\r\n]/;

function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number") return String(cell);
  const text = FORMULA_START.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Conteúdo do arquivo, já com o BOM. */
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}`;
}

/** Baixa o CSV no navegador. */
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const blob = new Blob([buildCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** "1234,56": valor em reais com vírgula decimal, como o Excel em pt-BR espera. */
export function centsToCsvDecimal(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
