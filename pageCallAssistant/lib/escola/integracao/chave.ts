/**
 * lib/escola/integracao/chave.ts
 *
 * Chave de acesso de um sistema externo. Funções puras (sem banco).
 *
 * Formato: sfe_<rede em base64url>.<segredo aleatório de 32 bytes em base64url>
 *   (o ponto separa as duas partes porque não existe em base64url)
 *   - a rede vai na própria chave para sabermos em qual banco procurar, sem índice global;
 *   - no banco fica só o SHA-256 da chave inteira: quem lê o banco não consegue usá-la;
 *   - a chave é mostrada uma única vez, na criação.
 */
import { createHash, randomBytes } from "node:crypto";

export const PREFIXO_CHAVE = "sfe";

/** O que uma chave pode fazer. Cada rota exige um destes. */
export const ESCOPOS = {
  "cadastros:escrever": "Enviar escolas, servidores, alunos, turmas e atribuições",
  "resultados:ler": "Consultar os degraus e a evolução dos alunos",
} as const;
export type Escopo = keyof typeof ESCOPOS;

export function ehEscopo(v: unknown): v is Escopo {
  return typeof v === "string" && v in ESCOPOS;
}

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

/** Gera uma chave nova. `prefixo` é o trecho que pode ficar visível na tela. */
export function gerarChave(networkId: string): { chave: string; hash: string; prefixo: string } {
  const segredo = randomBytes(32).toString("base64url");
  const chave = `${PREFIXO_CHAVE}_${b64url(networkId)}.${segredo}`;
  return { chave, hash: hashDaChave(chave), prefixo: `${PREFIXO_CHAVE}_…${segredo.slice(0, 6)}` };
}

export function hashDaChave(chave: string): string {
  return createHash("sha256").update(chave, "utf8").digest("hex");
}

/** Lê a rede de dentro da chave. Devolve null se o formato não for o nosso. */
export function redeDaChave(chave: string): string | null {
  const m = /^sfe_([A-Za-z0-9_-]{1,200})\.([A-Za-z0-9_-]{40,60})$/.exec(chave.trim());
  if (!m) return null;
  try {
    const rede = Buffer.from(m[1], "base64url").toString("utf8");
    // ids de rede são curtos e simples; qualquer coisa fora disso não é chave nossa
    return /^[A-Za-z0-9_-]{1,100}$/.test(rede) ? rede : null;
  } catch {
    return null;
  }
}

/** Tira a chave do cabeçalho: "Authorization: Bearer <chave>" ou "X-Api-Key: <chave>". */
export function chaveDoCabecalho(authorization: string | null, xApiKey: string | null): string | null {
  const bearer = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  const chave = bearer?.[1] ?? xApiKey?.trim() ?? "";
  return chave.startsWith(`${PREFIXO_CHAVE}_`) ? chave : null;
}

/** IPv4 em número, ou null. */
function ipv4(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const parte of p) {
    if (!/^\d{1,3}$/.test(parte)) return null;
    const v = Number(parte);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

/**
 * O endereço de quem chamou está na lista permitida?
 * Lista vazia = qualquer endereço. Aceita IP exato (v4 ou v6) e faixa IPv4 em CIDR (200.10.0.0/24).
 */
export function ipPermitido(ip: string | null, permitidos: string[] | null | undefined): boolean {
  const lista = (permitidos ?? []).map((s) => s.trim()).filter(Boolean);
  if (!lista.length) return true;
  if (!ip) return false;
  const limpo = ip.trim().replace(/^::ffff:/i, "");
  const n = ipv4(limpo);
  for (const regra of lista) {
    if (regra.toLowerCase() === limpo.toLowerCase()) return true;
    const cidr = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(regra);
    if (cidr && n !== null) {
      const base = ipv4(cidr[1]);
      const bits = Number(cidr[2]);
      if (base === null || bits > 32) continue;
      const tamanho = 2 ** (32 - bits);
      const inicio = Math.floor(base / tamanho) * tamanho;
      if (n >= inicio && n < inicio + tamanho) return true;
    }
  }
  return false;
}

/** Valida a lista de IPs informada pelo gestor. Devolve as regras limpas ou a primeira inválida. */
export function validarListaDeIps(lista: unknown): { ok: true; ips: string[] } | { ok: false; invalido: string } {
  if (lista == null) return { ok: true, ips: [] };
  if (!Array.isArray(lista)) return { ok: false, invalido: String(lista) };
  const ips: string[] = [];
  for (const bruto of lista) {
    const regra = String(bruto).trim();
    if (!regra) continue;
    const cidr = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/.exec(regra);
    const v4ok = cidr && ipv4(cidr[1]) !== null && (cidr[2] === undefined || Number(cidr[2]) <= 32);
    const v6ok = /^[0-9a-fA-F:]{2,45}$/.test(regra) && regra.includes(":");
    if (!v4ok && !v6ok) return { ok: false, invalido: regra };
    ips.push(regra);
  }
  if (ips.length > 20) return { ok: false, invalido: "mais de 20 endereços" };
  return { ok: true, ips };
}
