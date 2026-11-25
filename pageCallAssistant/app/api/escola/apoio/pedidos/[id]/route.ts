/**
 * Um pedido de apoio, para a equipe indicada.
 * GET   -> conteúdo completo (texto e endereço temporário do áudio). Toda abertura fica na auditoria.
 * PATCH -> situação, observação interna e para onde foi encaminhado.
 */
import { NextRequest, NextResponse } from "next/server";
import { contextoDaEquipe } from "@/lib/escola/apoio-equipe";
import { getAudioSignedUrl, isAudioStorageConfigured } from "@/lib/escola/audio-store";
import { statusValido, desfechoValido, orgaosValidos, MAX_OBSERVACAO } from "@/lib/escola/apoio-aluno";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, P, filtro, erro } = await contextoDaEquipe();
  if (erro) return erro;
  const p = await P.eduPedidoApoio.findFirst({ where: { ...filtro, id: params.id } });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (!p.vistoAt) await P.eduPedidoApoio.update({ where: { id: p.id }, data: { vistoAt: new Date(), vistoPorId: ctx!.userId } }).catch(() => null);
  await P.eduAuditLog.create({
    data: { networkId: ctx!.networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.pedido.lido", entity: "EduPedidoApoio", entityId: p.id },
  }).catch(() => {});

  const [aluno, turma, escola] = await Promise.all([
    P.eduStudent.findUnique({ where: { id: p.studentId }, select: { fullName: true } }),
    p.classId ? P.eduClass.findUnique({ where: { id: p.classId }, select: { name: true } }) : null,
    p.schoolId ? P.eduSchool.findUnique({ where: { id: p.schoolId }, select: { name: true } }) : null,
  ]);
  let audioUrl: string | null = null;
  if (p.audioKey && isAudioStorageConfigured()) audioUrl = await getAudioSignedUrl(p.audioKey).catch(() => null);

  return NextResponse.json({
    pedido: {
      id: p.id, aluno: aluno?.fullName ?? "Aluno", turma: turma?.name ?? "", escola: escola?.name ?? "",
      assunto: p.assunto, status: p.status, texto: p.text, temAudio: !!p.audioKey, audioUrl,
      observacao: p.observacao ?? "", encaminhadoPara: p.encaminhadoPara ?? "", createdAt: p.createdAt,
      desfecho: p.desfecho ?? null, comunicadoA: p.comunicadoA ?? [], comunicadoEm: p.comunicadoEm ?? null,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, P, filtro, erro } = await contextoDaEquipe();
  if (erro) return erro;
  const p = await P.eduPedidoApoio.findFirst({ where: { ...filtro, id: params.id }, select: { id: true, status: true, comunicadoA: true, comunicadoEm: true, responsavelId: true } });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { status?: unknown; observacao?: unknown; encaminhadoPara?: unknown; desfecho?: unknown; comunicadoA?: unknown };
  const agora = new Date();
  const data: Record<string, unknown> = { updatedAt: agora };
  if (b.status !== undefined) {
    if (!statusValido(b.status)) return NextResponse.json({ error: "Situação inválida." }, { status: 400 });
    data.status = b.status;
    if (b.status === "CONCLUIDO") {
      // Concluir exige dizer como terminou
      if (!desfechoValido(b.desfecho)) return NextResponse.json({ error: "Diga como o pedido foi concluído." }, { status: 400 });
      data.desfecho = b.desfecho; data.concluidoEm = agora;
    } else {
      data.desfecho = null; data.concluidoEm = null;
    }
    // Quem primeiro tira o pedido de "novo" fica como responsável
    if (b.status !== "RECEBIDO" && !p.responsavelId) data.responsavelId = ctx!.userId;
  }
  if (b.comunicadoA !== undefined) {
    const orgaos = orgaosValidos(b.comunicadoA);
    if (!orgaos) return NextResponse.json({ error: "Órgão inválido." }, { status: 400 });
    data.comunicadoA = orgaos;
    data.comunicadoEm = orgaos.length ? p.comunicadoEm ?? agora : null;
  }
  if (typeof b.observacao === "string") data.observacao = b.observacao.trim().slice(0, MAX_OBSERVACAO) || null;
  if (typeof b.encaminhadoPara === "string") data.encaminhadoPara = b.encaminhadoPara.trim().slice(0, 200) || null;

  await P.eduPedidoApoio.update({ where: { id: p.id }, data });
  await P.eduAuditLog.create({
    data: {
      networkId: ctx!.networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.pedido.atualizado", entity: "EduPedidoApoio", entityId: p.id,
      // Só a mudança de situação; a observação da equipe não vai para a auditoria
      metadata: { ...(data.status ? { de: p.status, para: data.status } : {}), ...(data.desfecho ? { desfecho: data.desfecho } : {}), ...(data.comunicadoA ? { comunicadoA: data.comunicadoA } : {}) },
    },
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
