/**
 * Um pedido de apoio, para a equipe indicada.
 * GET   -> conteúdo completo (texto e endereço temporário do áudio). Toda abertura fica na auditoria.
 * PATCH -> situação, observação interna e para onde foi encaminhado.
 */
import { NextRequest, NextResponse } from "next/server";
import { contextoDaEquipe } from "@/lib/escola/apoio-equipe";
import { getAudioSignedUrl, isAudioStorageConfigured } from "@/lib/escola/audio-store";
import { Resend } from "resend";
import { remetenteFamilia } from "@/lib/escola/email-familia";
import { urlDoSite } from "@/lib/escola/public-url";
import { statusValido, desfechoValido, orgaosValidos, atendeAEscola, emailCasoRecebido, MAX_OBSERVACAO } from "@/lib/escola/apoio-aluno";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, P, filtro, membro, erro } = await contextoDaEquipe();
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
  // Colegas da equipe que atendem a escola deste aluno, para passar o caso
  const equipe: { userId: string; funcao: string; schoolIds: string[] }[] = await P.eduEquipeApoio.findMany({
    where: { networkId: ctx!.networkId }, select: { userId: true, funcao: true, schoolIds: true },
  });
  const queAtendem = equipe.filter((e) => atendeAEscola(e.schoolIds, p.schoolId));
  const usuarios: { id: string; name: string }[] = await P.eduUser.findMany({
    where: { id: { in: Array.from(new Set([...queAtendem.map((e) => e.userId), p.responsavelId, ctx!.userId].filter(Boolean))) } }, select: { id: true, name: true },
  });
  const nomeDe = new Map(usuarios.map((u) => [u.id, u.name]));
  const rede = await P.eduNetwork.findUnique({ where: { id: ctx!.networkId }, select: { name: true, city: true, state: true } });

  let audioUrl: string | null = null;
  if (p.audioKey && isAudioStorageConfigured()) audioUrl = await getAudioSignedUrl(p.audioKey).catch(() => null);

  return NextResponse.json({
    pedido: {
      id: p.id, aluno: aluno?.fullName ?? "Aluno", turma: turma?.name ?? "", escola: escola?.name ?? "",
      assunto: p.assunto, status: p.status, texto: p.text, temAudio: !!p.audioKey, audioUrl,
      observacao: p.observacao ?? "", encaminhadoPara: p.encaminhadoPara ?? "", createdAt: p.createdAt,
      desfecho: p.desfecho ?? null, comunicadoA: p.comunicadoA ?? [], comunicadoEm: p.comunicadoEm ?? null,
      responsavel: p.responsavelId ? { id: p.responsavelId, nome: nomeDe.get(p.responsavelId) ?? "Pessoa da equipe" } : null,
    },
    eu: { id: ctx!.userId, nome: nomeDe.get(ctx!.userId) ?? "", funcao: membro!.funcao },
    colegas: queAtendem.map((e) => ({ id: e.userId, nome: nomeDe.get(e.userId) ?? "Pessoa da equipe", funcao: e.funcao })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    rede: { nome: rede?.name ?? "", cidade: rede?.city ?? "", uf: rede?.state ?? "" },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, P, filtro, erro } = await contextoDaEquipe();
  if (erro) return erro;
  const p = await P.eduPedidoApoio.findFirst({ where: { ...filtro, id: params.id }, select: { id: true, status: true, schoolId: true, comunicadoA: true, comunicadoEm: true, responsavelId: true } });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { status?: unknown; observacao?: unknown; encaminhadoPara?: unknown; desfecho?: unknown; comunicadoA?: unknown; passarPara?: unknown };
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
    if (b.status !== "RECEBIDO" && !p.responsavelId && !data.responsavelId) data.responsavelId = ctx!.userId;
  }
  if (b.comunicadoA !== undefined) {
    const orgaos = orgaosValidos(b.comunicadoA);
    if (!orgaos) return NextResponse.json({ error: "Órgão inválido." }, { status: 400 });
    data.comunicadoA = orgaos;
    data.comunicadoEm = orgaos.length ? p.comunicadoEm ?? agora : null;
  }
  // Passar o caso para um colega da equipe que atende a escola do aluno
  let passouPara: string | null = null;
  if (typeof b.passarPara === "string" && b.passarPara && b.passarPara !== p.responsavelId) {
    const colega = await P.eduEquipeApoio.findFirst({ where: { networkId: ctx!.networkId, userId: b.passarPara }, select: { userId: true, schoolIds: true } });
    if (!colega || !atendeAEscola(colega.schoolIds, p.schoolId)) return NextResponse.json({ error: "Esta pessoa não atende a escola do aluno." }, { status: 400 });
    data.responsavelId = colega.userId;
    passouPara = colega.userId;
    if (b.status === undefined && p.status === "RECEBIDO") data.status = "EM_ACOMPANHAMENTO";
  }
  if (typeof b.observacao === "string") data.observacao = b.observacao.trim().slice(0, MAX_OBSERVACAO) || null;
  if (typeof b.encaminhadoPara === "string") data.encaminhadoPara = b.encaminhadoPara.trim().slice(0, 200) || null;

  // Registrar qualquer providência em um pedido novo já o tira de "novo":
  // com órgão comunicado vai para "encaminhado"; senão, para "em acompanhamento".
  if (b.status === undefined && p.status === "RECEBIDO") {
    const orgaos = (data.comunicadoA as string[] | undefined) ?? p.comunicadoA ?? [];
    if (orgaos.length || data.observacao || data.encaminhadoPara) {
      data.status = orgaos.length ? "ENCAMINHADO" : "EM_ACOMPANHAMENTO";
      if (!p.responsavelId && !data.responsavelId) data.responsavelId = ctx!.userId;
    }
  }

  await P.eduPedidoApoio.update({ where: { id: p.id }, data });
  await P.eduAuditLog.create({
    data: {
      networkId: ctx!.networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.pedido.atualizado", entity: "EduPedidoApoio", entityId: p.id,
      // Só a mudança de situação; a observação da equipe não vai para a auditoria
      metadata: { ...(data.status ? { de: p.status, para: data.status } : {}), ...(data.desfecho ? { desfecho: data.desfecho } : {}), ...(data.comunicadoA ? { comunicadoA: data.comunicadoA } : {}) },
    },
  }).catch(() => {});
  if (passouPara) {
    await P.eduAuditLog.create({
      data: { networkId: ctx!.networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.pedido.passado", entity: "EduPedidoApoio", entityId: p.id, metadata: { para: passouPara } },
    }).catch(() => {});
    if (passouPara !== ctx!.userId) avisarColega(P, passouPara).catch(() => {});
  }
  return NextResponse.json({ ok: true, status: (data.status as string | undefined) ?? p.status });
}

/** Aviso ao colega que recebeu o caso: sem nome do aluno e sem conteúdo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function avisarColega(P: any, userId: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const pessoa = await P.eduUser.findUnique({ where: { id: userId }, select: { email: true, isActive: true } });
  if (!pessoa?.email || !pessoa.isActive) return;
  const msg = emailCasoRecebido(urlDoSite());
  await new Resend(key).emails.send({ from: remetenteFamilia(), to: pessoa.email, subject: msg.subject, text: msg.text });
}
