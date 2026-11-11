/**
 * Data no formato brasileiro digitada à mão (DD/MM/AAAA).
 * Usada no lugar do <input type="date">, que no iPhone e no Android sai da largura da tela.
 */

/** 12032015 -> 12/03/2015 enquanto digita */
export function mascaraData(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

/** 12/03/2015 -> 2015-03-12, ou "" se a data não existir ou estiver fora de 1990..ano atual */
export function dataIso(v: string, hoje = new Date()): string {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, aaaa] = m;
  const dt = new Date(`${aaaa}-${mm}-${dd}T12:00:00Z`);
  if (isNaN(dt.getTime()) || dt.getUTCDate() !== Number(dd) || dt.getUTCMonth() + 1 !== Number(mm)) return "";
  const ano = Number(aaaa);
  if (ano < 1990 || ano > hoje.getFullYear()) return "";
  return `${aaaa}-${mm}-${dd}`;
}
