/**
 * /api/escola/rede/integracoes — gestão das integrações externas pela secretaria.
 * GET: chaves, endereços de aviso e histórico.  POST: cria chave ou endereço de aviso.
 *
 * A chave e o segredo aparecem uma única vez, na resposta da criação. No banco fica
 * o hash da chave e o segredo cifrado.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { ESCOPOS, ehEscopo, gerarChave, validarListaDeIps } from "@/lib/escola/integracao/chave";
import { limparDePara } from "@/lib/escola/integracao/mapa";
import { cifrar, gerarSegredo } from "@/lib/escola/integracao/cripto";
import { validarDestino } from "@/lib/escola/integracao/destino";
import { EVENTOS, ehEvento, esquecerCacheDeEnderecos } from "@/lib/escola/integracao/webhook";

export const dynamic = "force-dynamic";

const MAX_CHAVES = 10;
const MAX_ENDERECOS = 5;

async function gestor() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  return ctx;
}

export async function GET() {
  const ctx = await gestor();
  if (ctx instanceof NextResponse) return ctx;
  // O contexto do banco precisa ser definido aqui, no próprio tratador: definido dentro de
  // uma função auxiliar aguardada, ele não chega a este ponto (AsyncLocalStorage.enterWith).
  if (ctx.db) setTenantDb(ctx.db);

  try {
  const [chaves, enderecos, historico, entregas] = await Promise.all([
    prismaEdu.eduIntegrationKey.findMany({
      where: { networkId: ctx.networkId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, scopes: true, allowedIps: true, fieldMap: true, createdAt: true, expiresAt: true, lastUsedAt: true, revokedAt: true },
    }),
    prismaEdu.eduWebhookEndpoint.findMany({
      where: { networkId: ctx.networkId },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, events: true, isActive: true, failCount: true, createdAt: true, lastDeliveryAt: true, lastStatus: true },
    }),
    prismaEdu.eduIntegrationLog.findMany({
      where: { networkId: ctx.networkId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, keyId: true, direction: true, resource: true, status: true, received: true, created: true, updated: true, failed: true, errors: true, createdAt: true },
    }),
    prismaEdu.eduWebhookDelivery.findMany({
      where: { networkId: ctx.networkId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, endpointId: true, event: true, status: true, attempts: true, responseCode: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ chaves, enderecos, historico, entregas, escopos: ESCOPOS, eventos: EVENTOS }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[rede/integracoes] GET:", (err as Error).message);
    return NextResponse.json({ error: "Não foi possível carregar as integrações agora." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await gestor();
  if (ctx instanceof NextResponse) return ctx;
  // O contexto do banco precisa ser definido aqui, no próprio tratador: definido dentro de
  // uma função auxiliar aguardada, ele não chega a este ponto (AsyncLocalStorage.enterWith).
  if (ctx.db) setTenantDb(ctx.db);
  const body = await req.json().catch(() => ({}));

  if (body.tipo === "endereco") {
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const eventos = Array.isArray(body.eventos) ? body.eventos.filter(ehEvento) : [];
    if (!eventos.length) return NextResponse.json({ error: "Escolha pelo menos um aviso." }, { status: 400 });
    const destino = await validarDestino(url);
    if (!destino.ok) return NextResponse.json({ error: destino.motivo }, { status: 400 });
    const total = await prismaEdu.eduWebhookEndpoint.count({ where: { networkId: ctx.networkId } });
    if (total >= MAX_ENDERECOS) return NextResponse.json({ error: `No máximo ${MAX_ENDERECOS} endereços por rede.` }, { status: 400 });

    const segredo = gerarSegredo();
    const criado = await prismaEdu.eduWebhookEndpoint.create({
      data: { networkId: ctx.networkId, url: destino.url.toString(), secretEnc: cifrar(segredo), events: eventos, createdById: ctx.userId },
      select: { id: true },
    });
    esquecerCacheDeEnderecos(ctx.networkId);
    await prismaEdu.eduAuditLog.create({
      data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "integracao.endereco.criado", entity: "EduWebhookEndpoint", entityId: criado.id, metadata: { host: destino.url.hostname, eventos } },
    }).catch(() => null);
    return NextResponse.json({ id: criado.id, segredo }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }

  // tipo "chave" (padrão)
  const nome = typeof body.nome === "string" ? body.nome.trim().slice(0, 80) : "";
  if (nome.length < 3) return NextResponse.json({ error: "Dê um nome à chave (por exemplo, o nome do sistema)." }, { status: 400 });
  const escopos = Array.isArray(body.escopos) ? body.escopos.filter(ehEscopo) : [];
  if (!escopos.length) return NextResponse.json({ error: "Escolha pelo menos uma permissão." }, { status: 400 });
  const ips = validarListaDeIps(body.ips);
  if (!ips.ok) return NextResponse.json({ error: `Endereço IP inválido: ${ips.invalido}` }, { status: 400 });
  const dias = Number(body.validadeDias);
  const expiresAt = Number.isFinite(dias) && dias > 0 ? new Date(Date.now() + Math.min(dias, 3650) * 86_400_000) : null;

  const ativas = await prismaEdu.eduIntegrationKey.count({ where: { networkId: ctx.networkId, revokedAt: null } });
  if (ativas >= MAX_CHAVES) return NextResponse.json({ error: `No máximo ${MAX_CHAVES} chaves ativas por rede. Revogue uma para criar outra.` }, { status: 400 });

  const { chave, hash, prefixo } = gerarChave(ctx.networkId);
  const criada = await prismaEdu.eduIntegrationKey.create({
    data: {
      networkId: ctx.networkId, name: nome, prefix: prefixo, keyHash: hash,
      scopes: escopos, allowedIps: ips.ips, fieldMap: limparDePara(body.dePara),
      createdById: ctx.userId, expiresAt,
    },
    select: { id: true },
  });
  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "integracao.chave.criada", entity: "EduIntegrationKey", entityId: criada.id, metadata: { nome, escopos, ips: ips.ips.length } },
  }).catch(() => null);

  return NextResponse.json({ id: criada.id, chave }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
