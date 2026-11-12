/** Só conta como "travou" quando o aluno pede ajuda de verdade, não quando responde */
export function ehPedidoDeAjuda(t: string): boolean {
  const n = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /nao (sei|entendi|consigo|lembro)|pista|ajuda|dificil|travei|confus|como (eu )?(faco|comeco|resolvo)|o que (e|significa)|\?\s*$/.test(n);
}
