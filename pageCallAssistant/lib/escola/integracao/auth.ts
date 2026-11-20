/**
 * lib/escola/integracao/auth.ts
 *
 * Porta de entrada de toda rota /api/escola/integracao/v1/*.
 * Confere, nesta ordem: recurso ligado, formato da chave, rede, chave ativa (não revogada,
 * não vencida), endereço IP permitido, escopo e limite de chamadas. Qualquer falha de
 * identificação devolve a mesma resposta 401, sem dizer qual passo falhou.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { setTenantDb } from "@/lib/escola/db";
import { chaveDoCabecalho, hashDaChave, ipPermitido, redeDaChave, type Escopo } from "./chave";
import { contar, excedeu, ipDoCliente } from "./limite";
import { limparDePara } from "./mapa";

export interface IntegracaoCtx {
  networkId: string;
  keyId: string;
  keyName: string;
  scopes: string[];
  dePara: Record<string, string>;
  ip: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
}

const CHAMADAS_POR_MINUTO = 120;
const FALHAS_POR_MINUTO = 20;
const MINUTO = 60_000;

function erro(status: number, codigo: string, mensagem: string, extra?: Record<string, string>) {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status, headers: { "Cache-Control": "no-store", ...(extra ?? {}) } });
}

const NAO_AUTORIZADO = () => erro(401, "nao_autorizado", "Chave de integração ausente, inválida, vencida ou revogada.");

/** Devolve o contexto da integração, ou a resposta de erro pronta para devolver. */
export async function autenticarIntegracao(req: NextRequest, escopo: Escopo | null): Promise<IntegracaoCtx | NextResponse> {
  if (!isEscolasEnabled()) return erro(404, "nao_encontrado", "Não encontrado.");

  const saltos = Number(process.env.ESCOLAS_PROXY_HOPS ?? "1") || 1;
  const ip = ipDoCliente(req.headers.get("x-forwarded-for"), saltos);
  const origem = ip ?? "sem-ip";

  // Quem erra a chave muitas vezes espera: segura tentativa de adivinhar chave.
  const falhou = () => { contar(`falha:${origem}`, FALHAS_POR_MINUTO, MINUTO); return NAO_AUTORIZADO(); };
  const espera = excedeu(`falha:${origem}`, FALHAS_POR_MINUTO, MINUTO);
  if (espera) return erro(429, "muitas_chamadas", "Muitas chamadas. Tente de novo em instantes.", { "Retry-After": String(espera) });

  const chave = chaveDoCabecalho(req.headers.get("authorization"), req.headers.get("x-api-key"));
  if (!chave) return falhou();
  const networkId = redeDaChave(chave);
  if (!networkId) return falhou();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  try { db = await getTenantDb(networkId); } catch { return falhou(); }
  setTenantDb(db);

  const registro = await db.eduIntegrationKey.findUnique({ where: { keyHash: hashDaChave(chave) } }).catch(() => null);
  if (!registro || registro.networkId !== networkId) return falhou();
  if (registro.revokedAt) return falhou();
  if (registro.expiresAt && new Date(registro.expiresAt).getTime() <= Date.now()) return falhou();

  if (!ipPermitido(ip, registro.allowedIps)) {
    return erro(403, "ip_nao_permitido", "Esta chave só pode ser usada a partir dos endereços cadastrados.");
  }
  if (escopo && !(registro.scopes ?? []).includes(escopo)) {
    return erro(403, "sem_permissao", `Esta chave não tem a permissão "${escopo}".`);
  }

  const aguarde = contar(`chave:${registro.id}`, CHAMADAS_POR_MINUTO, MINUTO);
  if (aguarde) return erro(429, "muitas_chamadas", `Limite de ${CHAMADAS_POR_MINUTO} chamadas por minuto.`, { "Retry-After": String(aguarde) });

  // Marca o último uso, no máximo uma vez por minuto, sem segurar a resposta.
  if (!registro.lastUsedAt || Date.now() - new Date(registro.lastUsedAt).getTime() > MINUTO) {
    void db.eduIntegrationKey.update({ where: { id: registro.id }, data: { lastUsedAt: new Date() } }).catch(() => null);
  }

  return {
    networkId,
    keyId: registro.id,
    keyName: registro.name,
    scopes: registro.scopes ?? [],
    dePara: limparDePara(registro.fieldMap),
    ip,
    db,
  };
}

/** Resposta de erro no formato da integração. */
export const erroIntegracao = erro;

/** Grava uma linha no histórico de integrações. Nunca derruba a chamada. */
export async function registrarIntegracao(
  ctx: Pick<IntegracaoCtx, "networkId" | "keyId" | "ip" | "db">,
  dados: { direction: "IN" | "OUT"; resource: string; status: "OK" | "PARTIAL" | "ERROR"; received?: number; created?: number; updated?: number; failed?: number; errors?: unknown },
): Promise<void> {
  await ctx.db.eduIntegrationLog.create({
    data: {
      networkId: ctx.networkId, keyId: ctx.keyId, ip: ctx.ip,
      direction: dados.direction, resource: dados.resource, status: dados.status,
      received: dados.received ?? 0, created: dados.created ?? 0, updated: dados.updated ?? 0, failed: dados.failed ?? 0,
      ...(dados.errors ? { errors: dados.errors } : {}),
    },
  }).catch(() => null);
}
