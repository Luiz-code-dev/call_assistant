/**
 * /api/escola/rede/integracoes/[id]?tipo=chave|endereco
 * PATCH: atualiza o de-para e os IPs de uma chave, ou liga/desliga um endereço.
 * DELETE: revoga a chave (para de funcionar na hora) ou remove o endereço de aviso.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { validarListaDeIps } from "@/lib/escola/integracao/chave";
import { limparDePara } from "@/lib/escola/integracao/mapa";
import { esquecerCacheDeEnderecos } from "@/lib/escola/integracao/webhook";

export const dynamic = "force-dynamic";

async function gestor() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  return ctx;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await gestor();
  if (ctx instanceof NextResponse) return ctx;
  const tipo = new URL(req.url).searchParams.get("tipo");
  const body = await req.json().catch(() => ({}));

  if (tipo === "endereco") {
    const r = await prismaEdu.eduWebhookEndpoint.updateMany({
      where: { id: params.id, networkId: ctx.networkId },
      data: { isActive: Boolean(body.ativo), ...(body.ativo ? { failCount: 0 } : {}) },
    });
    if (!r.count) return NextResponse.json({ error: "Endereço não encontrado" }, { status: 404 });
    esquecerCacheDeEnderecos(ctx.networkId);
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = {};
  if (body.dePara !== undefined) data.fieldMap = limparDePara(body.dePara);
  if (body.ips !== undefined) {
    const ips = validarListaDeIps(body.ips);
    if (!ips.ok) return NextResponse.json({ error: `Endereço IP inválido: ${ips.invalido}` }, { status: 400 });
    data.allowedIps = ips.ips;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada para alterar." }, { status: 400 });
  const r = await prismaEdu.eduIntegrationKey.updateMany({ where: { id: params.id, networkId: ctx.networkId, revokedAt: null }, data });
  if (!r.count) return NextResponse.json({ error: "Chave não encontrada" }, { status: 404 });
  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "integracao.chave.alterada", entity: "EduIntegrationKey", entityId: params.id, metadata: { campos: Object.keys(data) } },
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await gestor();
  if (ctx instanceof NextResponse) return ctx;
  const tipo = new URL(req.url).searchParams.get("tipo");

  if (tipo === "endereco") {
    const r = await prismaEdu.eduWebhookEndpoint.deleteMany({ where: { id: params.id, networkId: ctx.networkId } });
    if (!r.count) return NextResponse.json({ error: "Endereço não encontrado" }, { status: 404 });
    esquecerCacheDeEnderecos(ctx.networkId);
    await prismaEdu.eduAuditLog.create({
      data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "integracao.endereco.removido", entity: "EduWebhookEndpoint", entityId: params.id },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  // A chave não é apagada: fica revogada, para o histórico continuar legível.
  const r = await prismaEdu.eduIntegrationKey.updateMany({
    where: { id: params.id, networkId: ctx.networkId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!r.count) return NextResponse.json({ error: "Chave não encontrada" }, { status: 404 });
  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "integracao.chave.revogada", entity: "EduIntegrationKey", entityId: params.id },
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
