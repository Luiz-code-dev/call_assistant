/**
 * Decode a CSV file buffer, auto-detecting encoding.
 *
 * Priority:
 * 1. UTF-8 with BOM (strip BOM and decode)
 * 2. Strict UTF-8 (throw on invalid sequences)
 * 3. Windows-1252 fallback — files exported by legacy Brazilian public systems
 *    (e.g. SIGE, sistemas estaduais, Excel em português)
 */
export function decodeCsv(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // 1) UTF-8 with BOM (EF BB BF)
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  // 2) Try strict UTF-8 — if it throws, the file is not valid UTF-8
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // 3) Legacy encoding used by Windows / Excel pt-BR and many public systems
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
