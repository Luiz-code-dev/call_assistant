/**
 * CSV parser that handles:
 * - Semicolon or comma separator (auto-detect)
 * - UTF-8 and Windows-1252 (Latin-1) encoding
 * - CRLF and LF line endings
 * - Quoted fields
 */

export type ParsedRow = Record<string, string>;

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  rowCount: number;
  separator: ";" | ",";
}

/** Decode a Buffer as UTF-8 or Latin-1 (Windows-1252 fallback) */
export function decodeBuffer(buf: Buffer): string {
  const utf8 = buf.toString("utf8");
  // If replacement characters appear, try latin1
  if (utf8.includes("\uFFFD")) {
    return buf.toString("latin1");
  }
  // Strip BOM if present
  return utf8.startsWith("\uFEFF") ? utf8.slice(1) : utf8;
}

/** Detect separator from first line */
function detectSeparator(firstLine: string): ";" | "," {
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

/** Parse a CSV string into rows */
export function parseCsvString(text: string): ParseResult {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0, separator: ";" };

  const separator = detectSeparator(lines[0]);

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === separator && !inQuote) {
        result.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, "_"));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.every(c => c === "")) continue;
    const row: ParsedRow = {};
    headers.forEach((h, idx) => { row[h] = cells[idx]?.trim() ?? ""; });
    rows.push(row);
  }

  return { headers, rows, rowCount: rows.length, separator };
}

/** Parse Buffer (CSV or XLSX-converted-to-CSV) */
export async function parseFileBuffer(buf: Buffer, mimeType: string): Promise<ParseResult> {
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("xlsx") || mimeType.includes("xls")) {
    // Lazy import XLSX only when needed
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const csv: string = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
    return parseCsvString(csv);
  }
  const text = decodeBuffer(buf);
  return parseCsvString(text);
}

/** Generate a CSV template as a string */
export function generateTemplate(kind: "SCHOOLS" | "STAFF" | "STUDENTS" | "ASSIGNMENTS"): string {
  const templates: Record<string, string[][]> = {
    SCHOOLS: [
      ["codigo_inep", "nome_escola", "bairro", "etapas_atendidas"],
      ["29123456", "Escola Municipal Exemplo A", "Centro", "ANOS_INICIAIS,ANOS_FINAIS"],
    ],
    STAFF: [
      ["nome", "email", "matricula_funcional", "papel", "codigo_inep_escola", "componentes"],
      ["Ana Souza", "ana.souza@escola.gov.br", "12345", "PROFESSOR", "29123456", "Língua Inglesa"],
      ["Carlos Lima", "carlos.lima@escola.gov.br", "12346", "COORDENADOR", "", ""],
    ],
    STUDENTS: [
      ["codigo_inep", "turma", "etapa", "ano_serie", "turno", "matricula_aluno", "nome_aluno", "data_nascimento"],
      ["29123456", "7º B", "ANOS_FINAIS", "7", "VESPERTINO", "2026000123", "Maria Clara Santos", "2014-03-10"],
    ],
    ASSIGNMENTS: [
      ["codigo_inep", "turma", "componente", "email_professor"],
      ["29123456", "7º B", "Língua Inglesa", "ana.souza@escola.gov.br"],
    ],
  };
  const rows = templates[kind] ?? [];
  return rows.map(r => r.join(";")).join("\r\n");
}
