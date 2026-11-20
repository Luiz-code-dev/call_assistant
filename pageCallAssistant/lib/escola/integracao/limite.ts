/**
 * lib/escola/integracao/limite.ts
 *
 * Limite de chamadas por janela de tempo, em memória (por instância do servidor).
 * Serve para segurar abuso e erro de configuração do sistema externo; com mais de uma
 * instância, o limite efetivo é por instância.
 */
interface Janela { inicio: number; n: number }
const janelas = new Map<string, Janela>();
const MAX_CHAVES = 5000;

/** Conta uma chamada. Devolve quantos segundos faltam para liberar, ou 0 se está dentro do limite. */
export function contar(chave: string, limite: number, janelaMs: number, agora = Date.now()): number {
  const j = janelas.get(chave);
  if (!j || agora - j.inicio >= janelaMs) {
    if (janelas.size >= MAX_CHAVES) {
      janelas.forEach((v, k) => { if (agora - v.inicio >= janelaMs) janelas.delete(k); });
      if (janelas.size >= MAX_CHAVES) janelas.clear();
    }
    janelas.set(chave, { inicio: agora, n: 1 });
    return 0;
  }
  j.n++;
  if (j.n <= limite) return 0;
  return Math.max(1, Math.ceil((j.inicio + janelaMs - agora) / 1000));
}

/** Consulta sem contar: segundos que faltam se a chave já passou do limite, ou 0. */
export function excedeu(chave: string, limite: number, janelaMs: number, agora = Date.now()): number {
  const j = janelas.get(chave);
  if (!j || agora - j.inicio >= janelaMs || j.n < limite) return 0;
  return Math.max(1, Math.ceil((j.inicio + janelaMs - agora) / 1000));
}

/** Só para testes. */
export function zerarLimites(): void { janelas.clear(); }

/**
 * Endereço de quem chamou. O cabeçalho X-Forwarded-For é uma lista em que cada proxy
 * acrescenta, no fim, o endereço de quem falou com ele; o começo da lista é escrito pelo
 * próprio cliente e não é confiável. Pegamos a entrada escrita pelo proxy mais externo
 * em que confiamos: `saltos` proxies entre a internet e o servidor (padrão 1).
 */
export function ipDoCliente(xForwardedFor: string | null, saltos = 1): string | null {
  const lista = (xForwardedFor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!lista.length) return null;
  const i = lista.length - Math.max(1, saltos);
  return lista[Math.max(0, i)] ?? null;
}
