/**
 * POST /api/escola/aluno/diagnostico/sessao
 * I1: sessão de diagnóstico no servidor — uma questão por vez.
 *
 * Corpo do POST:
 *   { action: "iniciar", diagnosticId: string }              → retorna a 1ª questão + sessionId
 *   { action: "responder", sessionId: string, selectedIndex: number, elapsedMs: number }
 *                                                             → valida resposta, aplica degrau se NOT_YET,
 *                                                               retorna próxima questão ou conclusão
 *
 * Integridade:
 *   I1 — questão por questão, estado no servidor
 *   I2 — elapsedMs deve ser ≥ minMsPerQuestion (padrão 5 s)
 *   I3 — ordem das questões embaralhada por sessão (shuffleOrder gravado no DB)
 *   I6 — se o aluno sair, pode retomar pelo sessionId
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { calcularDegrau, aplicarDegrau } from "@/lib/escola/diagnostico-degrau";
import { recordMasteryEvent } from "@/lib/escola/mastery-event";
import { assignAfterDiagnostic } from "@/lib/escola/track-assignment";

const P = prismaEdu as any;
const SESSION_HOURS = 4;
const MIN_MS_PER_Q = 5_000;

/** Fisher-Yates determinístico com seed numérico. */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  const body = await req.json();
  const { action } = body;

  // ── INICIAR ──────────────────────────────────────────────────────────────────
  if (action === "iniciar") {
    const { diagnosticId } = body as { diagnosticId: string };
    if (!diagnosticId) return NextResponse.json({ error: "diagnosticId obrigatório" }, { status: 400 });

    // Verifica se o diagnóstico está OPEN e pertence à rede
    const diag = await P.eduDiagnostic.findFirst({
      where: { id: diagnosticId, networkId: ctx.networkId, status: "OPEN" },
      include: { items: { orderBy: { order: "asc" }, include: { activity: { include: { questions: { orderBy: { order: "asc" } } } } } } },
    });
    if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado ou não aberto" }, { status: 404 });

    const items = diag.items as any[];
    if (!items.length) return NextResponse.json({ error: "Diagnóstico sem itens" }, { status: 422 });

    // Verifica se já existe sessão ativa
    const existingSession = await P.eduAttemptSession.findUnique({
      where: { studentId_activityId_diagnosticId: { studentId: ctx.studentId, activityId: items[0].activityId, diagnosticId } },
    });
    if (existingSession && !existingSession.completedAt) {
      // Retoma sessão existente
      const shuffleOrder = existingSession.shuffleOrder as number[];
      const idx = existingSession.currentQuestion;
      const itemIdx = shuffleOrder[idx] ?? idx;
      const item = items[itemIdx];
      return NextResponse.json({
        sessionId: existingSession.id,
        questaoAtual: idx + 1,
        totalQuestoes: items.length,
        atividade: {
          id: item?.activity?.id,
          type: item?.activity?.type,
          prompt: item?.activity?.prompt,
          questions: item?.activity?.questions?.map((q: any) => ({
            id: q.id, question: q.question, options: q.options.map((o: any) => ({ text: typeof o === "string" ? o : o.text }))
          })),
          skillCode: item?.skill?.code,
        },
        retomada: true,
      });
    }

    // Embaralha a ordem das atividades do diagnóstico (I3)
    const seed = Date.now() & 0xffffffff;
    const indices = Array.from({ length: items.length }, (_, i) => i);
    const shuffleOrder = shuffleWithSeed(indices, seed);

    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);
    const session = await P.eduAttemptSession.create({
      data: {
        networkId: ctx.networkId,
        studentId: ctx.studentId,
        activityId: items[0].activityId,
        diagnosticId,
        currentQuestion: 0,
        shuffleOrder,
        answers: [],
        minMsPerQuestion: MIN_MS_PER_Q,
        expiresAt,
      },
    });

    const firstItem = items[shuffleOrder[0]] as any;
    return NextResponse.json({
      sessionId: session.id,
      questaoAtual: 1,
      totalQuestoes: items.length,
      atividade: {
        id: firstItem?.activity?.id,
        type: firstItem?.activity?.type,
        prompt: firstItem?.activity?.prompt,
        questions: firstItem?.activity?.questions?.map((q: any) => ({
          id: q.id, question: q.question, options: q.options.map((o: any) => ({ text: typeof o === "string" ? o : o.text }))
        })),
        skillCode: firstItem?.skill?.code,
      },
    });
  }

  // ── RESPONDER ────────────────────────────────────────────────────────────────
  if (action === "responder") {
    const { sessionId, selectedIndex, elapsedMs } = body as { sessionId: string; selectedIndex: number; elapsedMs: number };
    if (!sessionId || selectedIndex === undefined) return NextResponse.json({ error: "sessionId e selectedIndex obrigatórios" }, { status: 400 });

    const session = await P.eduAttemptSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    if (session.studentId !== ctx.studentId || session.networkId !== ctx.networkId)
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    if (session.completedAt) return NextResponse.json({ error: "Sessão já concluída" }, { status: 409 });
    if (new Date() > session.expiresAt) return NextResponse.json({ error: "Sessão expirada" }, { status: 410 });

    // I2: tempo mínimo por questão
    const elapsed = elapsedMs ?? 0;
    if (elapsed < session.minMsPerQuestion) {
      return NextResponse.json({ error: `Resposta muito rápida. Mínimo ${session.minMsPerQuestion / 1000}s por questão.` }, { status: 429 });
    }

    const diag = await P.eduDiagnostic.findUnique({
      where: { id: session.diagnosticId },
      include: { items: { orderBy: { order: "asc" }, include: { activity: { include: { questions: { orderBy: { order: "asc" } } } }, skill: { select: { id: true, code: true } } } } },
    });
    if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

    const items = diag.items as any[];
    const shuffleOrder = session.shuffleOrder as number[];
    const qIdx = session.currentQuestion;
    const itemIdx = shuffleOrder[qIdx] ?? qIdx;
    const currentItem = items[itemIdx];
    if (!currentItem) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

    const questions = currentItem.activity?.questions ?? [];
    const question = questions[0]; // uma questão por item de diagnóstico
    const isCorrect = question ? selectedIndex === question.correctIndex : false;
    const misconceptionCode = question?.options?.[selectedIndex]?.misconceptionCode ?? null;
    const masteryLevel = isCorrect ? "MASTERED" : "NOT_YET";

    // Grava resposta na sessão
    const prevAnswers = (session.answers as any[]) ?? [];
    const newAnswers = [...prevAnswers, {
      itemIndex: itemIdx,
      activityId: currentItem.activityId,
      skillCode: currentItem.skill?.code,
      selectedIndex,
      isCorrect,
      misconceptionCode,
      elapsedMs: elapsed,
      answeredAt: new Date().toISOString(),
    }];

    // R2: grava evento de domínio DIAGNOSTIC
    if (currentItem.skill?.id) {
      await recordMasteryEvent({
        networkId: ctx.networkId,
        studentId: ctx.studentId,
        skillId: currentItem.skill.id,
        level: masteryLevel as "MASTERED" | "NOT_YET",
        source: "DIAGNOSTIC",
      }).catch(() => null);
    }

    // R1: aplica degrau se NOT_YET e tem pré-requisito disponível
    let degrauResult: Awaited<ReturnType<typeof calcularDegrau>> | null = null;
    if (masteryLevel === "NOT_YET" && currentItem.skill?.code) {
      degrauResult = await calcularDegrau({
        networkId: ctx.networkId,
        diagnosticId: session.diagnosticId,
        studentId: ctx.studentId,
        skillCode: currentItem.skill.code,
        currentItemCount: items.length,
        currentMinutes: items.reduce((acc: number, it: any) => acc + (it.activity?.estMinutes ?? 5), 0),
      }).catch(() => null);

      if (degrauResult?.added?.length) {
        await aplicarDegrau(ctx.networkId, session.diagnosticId, ctx.studentId, degrauResult, items.length);
      }
    }

    const nextQ = qIdx + 1;
    const totalItems = items.length + (degrauResult?.added?.length ?? 0);
    const isLast = nextQ >= totalItems;

    if (isLast) {
      // Sessão concluída — grava resultado
      await P.eduAttemptSession.update({
        where: { id: sessionId },
        data: { answers: newAnswers, completedAt: new Date(), lastActivityAt: new Date() },
      });

      // L4: atribuição AUTO/SUGGEST após diagnóstico completo
      const notYetSkillIds = newAnswers
        .filter((a: any) => !a.isCorrect && a.skillCode)
        .map((a: any) => { const item = items.find((i: any) => i.activityId === a.activityId); return item?.skill?.id; })
        .filter(Boolean);

      if (notYetSkillIds.length > 0) {
        assignAfterDiagnostic({
          networkId: ctx.networkId,
          diagnosticId: session.diagnosticId,
          studentId: ctx.studentId,
          notYetSkillIds: Array.from(new Set(notYetSkillIds)),
          assignedBy: "system",
        }).catch(() => null);
      }

      return NextResponse.json({
        concluido: true,
        totalQuestoes: totalItems,
        resultado: {
          corretas: newAnswers.filter((a: any) => a.isCorrect).length,
          total: newAnswers.length,
        },
        degrauAplicado: !!(degrauResult?.added?.length),
      });
    }

    // Próxima questão
    await P.eduAttemptSession.update({
      where: { id: sessionId },
      data: { answers: newAnswers, currentQuestion: nextQ, lastActivityAt: new Date() },
    });

    // Busca o próximo item (pode ter sido expandido pelo degrau)
    const updatedDiag = await P.eduDiagnostic.findUnique({
      where: { id: session.diagnosticId },
      include: { items: { orderBy: { order: "asc" }, include: { activity: { include: { questions: { orderBy: { order: "asc" } } } }, skill: { select: { code: true } } } } },
    });
    const updatedItems = updatedDiag?.items ?? [];
    const updShuffleOrder = [...shuffleOrder];
    // Adiciona índices dos novos itens (degrau) ao final da ordem
    for (let i = shuffleOrder.length; i < updatedItems.length; i++) updShuffleOrder.push(i);

    const nextItemIdx = updShuffleOrder[nextQ] ?? nextQ;
    const nextItem = updatedItems[nextItemIdx] as any;

    return NextResponse.json({
      concluido: false,
      questaoAtual: nextQ + 1,
      totalQuestoes: updatedItems.length,
      degrauAplicado: !!(degrauResult?.added?.length),
      atividade: {
        id: nextItem?.activity?.id,
        type: nextItem?.activity?.type,
        prompt: nextItem?.activity?.prompt,
        questions: nextItem?.activity?.questions?.map((q: any) => ({
          id: q.id, question: q.question, options: q.options.map((o: any) => ({ text: typeof o === "string" ? o : o.text }))
        })),
        skillCode: nextItem?.skill?.code,
      },
    });
  }

  return NextResponse.json({ error: "action inválida (iniciar|responder)" }, { status: 400 });
}
