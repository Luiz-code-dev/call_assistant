/**
 * Canal de apoio, lado do aluno.
 * GET  -> se o canal está disponível para este aluno e a situação dos pedidos (sem texto nem áudio)
 * POST -> novo pedido (assunto obrigatório; texto e áudio opcionais)
 *
 * O que o aluno escreveu ou gravou nunca volta para o aparelho. Nada aqui passa por IA.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { isAudioStorageConfigured, uploadAudio } from "@/lib/escola/audio-store";
import { comVinculoAtivo } from "@/lib/escola/apoio-equipe";
import { remetenteFamilia } from "@/lib/escola/email-familia";
import { urlDoSite } from "@/lib/escola/public-url";
import {
  canalDisponivel, validarPedido, audioAceito, statusParaOAluno, emailNovoPedido, emailCienciaDaGestao, atendeAEscola, MAX_PEDIDOS_POR_DIA,
} from "@/lib/escola/apoio-aluno";

export const runtime = "nodejs";

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getStudentContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const P = ctx.db as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [rede, matricula] = await Promise.all([
    P.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { apoioAtivo: true, apoioAnoMinimo: true } }),
    P.eduEnrollment.findUnique({ where: { id: ctx.enrollmentId }, select: { class: { select: { id: true, gradeYear: true, schoolId: true } } } }),
  ]);
  const disponivel = canalDisponivel(rede, matricula?.class?.gradeYear);
  return { ctx, P, disponivel, turma: matricula?.class as { id: string; schoolId: string } | undefined };
}

export async function GET() {
  const { ctx, P, disponivel, erro } = await contexto();
  if (erro) return erro;
  if (!disponivel) return NextResponse.json({ disponivel: false });
  const pedidos: { id: string; status: string }[] = await P.eduPedidoApoio.findMany({
    where: { networkId: ctx!.networkId, studentId: ctx!.studentId, status: { not: "CONCLUIDO" } },
    orderBy: { createdAt: "desc" }, take: 3,
    select: { id: true, status: true },
  });
  return NextResponse.json({
    disponivel: true,
    audio: isAudioStorageConfigured(),
    // Só a situação, em palavras neutras. Sem data, texto ou assunto.
    pedidos: pedidos.map((p) => ({ id: p.id, situacao: statusParaOAluno(p.status) })),
  });
}

export async function POST(req: NextRequest) {
  const { ctx, P, disponivel, turma, erro } = await contexto();
  if (erro) return erro;
  if (!disponivel) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Não foi possível ler o pedido." }, { status: 400 });
  const v = validarPedido({ assunto: form.get("assunto"), text: form.get("text") });
  if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });

  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentes = await P.eduPedidoApoio.count({ where: { networkId: ctx!.networkId, studentId: ctx!.studentId, createdAt: { gte: desde } } });
  if (recentes >= MAX_PEDIDOS_POR_DIA) {
    return NextResponse.json({ error: "Você já enviou alguns pedidos hoje e eles chegaram. Se for urgente, ligue 100 ou procure um adulto de confiança na escola." }, { status: 429 });
  }

  const id = randomUUID();
  let audioKey: string | null = null;
  const audio = form.get("audio");
  if (audio && typeof audio !== "string" && audio.size > 0) {
    if (!isAudioStorageConfigured()) return NextResponse.json({ error: "A gravação não está disponível agora. Você pode escrever." }, { status: 400 });
    if (!audioAceito(audio.type, audio.size)) return NextResponse.json({ error: "Não foi possível usar esta gravação. Tente gravar de novo, mais curto." }, { status: 400 });
    try {
      audioKey = await uploadAudio(ctx!.networkId, `apoio-${id}`, Buffer.from(await audio.arrayBuffer()), audio.type);
    } catch {
      return NextResponse.json({ error: "Não foi possível guardar a gravação. Tente de novo ou escreva." }, { status: 502 });
    }
  }

  await P.eduPedidoApoio.create({
    data: {
      id, networkId: ctx!.networkId, studentId: ctx!.studentId,
      classId: turma?.id ?? ctx!.classId, schoolId: turma?.schoolId ?? null,
      assunto: v.assunto, text: v.text, audioKey,
    },
  });
  // Sem registro na auditoria geral: ela é lida por mais gente e mostraria quem pediu ajuda
  avisarEquipe(P, ctx!.networkId, turma?.schoolId ?? null).catch(() => {});
  return NextResponse.json({ ok: true }, { status: 201 });
}

/**
 * Avisos por e-mail, sempre sem nome do aluno, sem assunto e sem conteúdo:
 * - equipe de apoio que atende a escola do aluno: há um pedido para ler;
 * - gestão da secretaria que não está na equipe: só ciência de que chegou um pedido.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function avisarEquipe(P: any, networkId: string, schoolId: string | null) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const [equipe, gestores]: [{ userId: string; schoolIds: string[] }[], { userId: string }[]] = await Promise.all([
    P.eduEquipeApoio.findMany({ where: { networkId }, select: { userId: true, schoolIds: true } }),
    P.eduMembership.findMany({ where: { networkId, role: "NETWORK_ADMIN", isActive: true }, select: { userId: true } }),
  ]);
  const ativos = await comVinculoAtivo(P, networkId, equipe.map((e) => e.userId));
  const daEquipe = equipe.filter((e) => atendeAEscola(e.schoolIds, schoolId) && ativos.has(e.userId)).map((e) => e.userId);
  const todosDaEquipe = new Set(equipe.map((e) => e.userId));
  const soCiencia = Array.from(new Set(gestores.map((g) => g.userId))).filter((id) => !todosDaEquipe.has(id));
  const pessoas: { id: string; email: string }[] = await P.eduUser.findMany({
    where: { id: { in: [...daEquipe, ...soCiencia] }, isActive: true }, select: { id: true, email: true },
  });
  const site = urlDoSite();
  const paraEquipe = emailNovoPedido(site), paraGestao = emailCienciaDaGestao(site);
  const resend = new Resend(key);
  await Promise.all(pessoas.filter((p) => p.email).map((p) => {
    const msg = daEquipe.includes(p.id) ? paraEquipe : paraGestao;
    return resend.emails.send({ from: remetenteFamilia(), to: p.email, subject: msg.subject, text: msg.text }).catch(() => null);
  }));
}
