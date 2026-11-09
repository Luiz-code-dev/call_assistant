/**
 * POST /api/escola/aluno/diagnostico/sessao
 * Sessão de diagnóstico no servidor — uma questão por vez.
 *
 * Corpo:
 *   { action: "iniciar", diagnosticId }
 *   { action: "responder", sessionId, selectedIndex, elapsedMs }
 *
 * O diagnóstico pode ser:
 *   - OPEN (aberto pela escola para a turma) — fluxo da extensão escolar
 *   - APPROVED com networkId null (biblioteca SpeakFlow) — reforço autônomo
 *
 * Degrau: questões extras ficam em EduAttemptSession.extraItems (por aluno).
 * Nunca grava no EduDiagnosticItem compartilhado.
 *
 * Atribuição de trilha: sempre AUTO, sempre aguardada antes de responder.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { calcularDegrau } from "@/lib/escola/diagnostico-degrau";
import { recordMasteryEvent } from "@/lib/escola/mastery-event";
import { assignAfterDiagnostic } from "@/lib/escola/track-assignment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

const SESSION_HOURS = 4;
const MIN_MS_PER_Q = 5_000;

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

type ExtraItem = {
  activityId: string;
  skillCode: string;
  skillId: string;
  degrau: number;
  questions: Array<{ id: string; question: string; options: Array<{ text: string; misconceptionCode?: string }>; correctIndex: number; explanation?: string }>;
};

type Opcao = string | { text: string; misconceptionCode?: string };

function formatOpcoes(opts: Opcao[]): Array<{ text: string; misconceptionCode?: string }> {
  return opts.map((o) => (typeof o === "string" ? { text: o } : { text: o.text, misconceptionCode: o.misconceptionCode }));
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  const body = await req.json();
  const { action } = body;

  // ── INICIAR ───────────────────────────────────────────────────────────────
  if (action === "iniciar") {
    const { diagnosticId } = body as { diagnosticId: string };
    if (!diagnosticId) return NextResponse.json({ error: "diagnosticId obrigatório" }, { status: 400 });

    // Aceita OPEN (rede) ou APPROVED (biblioteca SpeakFlow — reforço autônomo)
    const diag = await P.eduDiagnostic.findFirst({
      where: {
        id: diagnosticId,
        status: { in: ["OPEN", "APPROVED"] },
        OR: [{ networkId: ctx.networkId }, { networkId: null }],
      },
      include: {
        items: {
          where: { isDegrauLegacy: false, role: "NORMAL" },
          orderBy: { order: "asc" },
          include: {
            activity: { include: { questions: { orderBy: { order: "asc" } } } },
            skill: { select: { id: true, code: true } },
          },
        },
      },
    });
    if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

    const items = diag.items as Array<{ id: string; activityId: string; skill: { id: string; code: string }; activity: { id: string; type: string; prompt: string; audioScript?: string; questions: Array<{ id: string; question: string; options: Opcao[]; correctIndex: number; explanation?: string }> } }>;
    if (!items.length) return NextResponse.json({ error: "Diagnóstico sem itens" }, { status: 422 });

    // Retoma sessão existente
    const existing = await P.eduAttemptSession.findFirst({
      where: { studentId: ctx.studentId, diagnosticId, completedAt: null },
    });
    if (existing && new Date() < existing.expiresAt) {
      const shuffleOrder = existing.shuffleOrder as number[];
      const extraItems = (existing.extraItems ?? []) as ExtraItem[];
      const idx = existing.currentQuestion;
      const isExtra = idx >= shuffleOrder.length;
      let atividade;
      if (isExtra) {
        const extra = extraItems[idx - shuffleOrder.length];
        atividade = extra ? {
          id: extra.activityId,
          type: "QUIZ",
          prompt: extra.questions[0]?.question ?? "",
          questions: extra.questions.map((q) => ({ id: q.id, question: q.question, options: q.options })),
          skillCode: extra.skillCode,
          isDegrau: true,
        } : null;
      } else {
        const item = items[shuffleOrder[idx] ?? idx];
        atividade = item ? {
          id: item.activity.id,
          type: item.activity.type,
          prompt: item.activity.prompt,
          questions: item.activity.questions.map((q) => ({ id: q.id, question: q.question, options: formatOpcoes(q.options) })),
          skillCode: item.skill.code,
        } : null;
      }
      return NextResponse.json({ sessionId: existing.id, questaoAtual: idx + 1, totalQuestoes: items.length + extraItems.length, atividade, retomada: true });
    }

    const seed = Date.now() & 0xffffffff;
    const shuffleOrder = shuffleWithSeed(Array.from({ length: items.length }, (_, i) => i), seed);
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);

    const session = await P.eduAttemptSession.create({
      data: {
        networkId: ctx.networkId,
        studentId: ctx.studentId,
        activityId: items[0].activityId,
        diagnosticId,
        currentQuestion: 0,
        shuffleOrder,
        extraItems: [],
        answers: [],
        minMsPerQuestion: MIN_MS_PER_Q,
        expiresAt,
      },
    });

    const first = items[shuffleOrder[0]];
    return NextResponse.json({
      sessionId: session.id,
      questaoAtual: 1,
      totalQuestoes: items.length,
      atividade: {
        id: first.activity.id,
        type: first.activity.type,
        prompt: first.activity.prompt,
        questions: first.activity.questions.map((q) => ({ id: q.id, question: q.question, options: formatOpcoes(q.options) })),
        skillCode: first.skill.code,
      },
    });
  }

  // ── RESPONDER ─────────────────────────────────────────────────────────────
  if (action === "responder") {
    const { sessionId, selectedIndex, elapsedMs } = body as { sessionId: string; selectedIndex: number; elapsedMs: number };
    if (!sessionId || selectedIndex === undefined) return NextResponse.json({ error: "sessionId e selectedIndex obrigatórios" }, { status: 400 });

    const session = await P.eduAttemptSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    if (session.studentId !== ctx.studentId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    if (session.completedAt) return NextResponse.json({ error: "Sessão já concluída" }, { status: 409 });
    if (new Date() > session.expiresAt) return NextResponse.json({ error: "Sessão expirada" }, { status: 410 });

    const elapsed = elapsedMs ?? 0;
    if (elapsed < session.minMsPerQuestion) {
      return NextResponse.json({ error: `Resposta muito rápida. Aguarde pelo menos ${session.minMsPerQuestion / 1000}s por questão.` }, { status: 429 });
    }

    const diag = await P.eduDiagnostic.findUnique({
      where: { id: session.diagnosticId },
      include: {
        items: {
          where: { isDegrauLegacy: false, role: "NORMAL" },
          orderBy: { order: "asc" },
          include: {
            activity: { include: { questions: { orderBy: { order: "asc" } } } },
            skill: { select: { id: true, code: true } },
          },
        },
      },
    });
    if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

    const items = diag.items as Array<{ activityId: string; skill: { id: string; code: string }; activity: { id: string; type: string; prompt: string; questions: Array<{ id: string; question: string; options: Opcao[]; correctIndex: number; explanation?: string }> } }>;
    const shuffleOrder = session.shuffleOrder as number[];
    const extraItems = (session.extraItems ?? []) as ExtraItem[];
    const qIdx = session.currentQuestion;
    const prevAnswers = (session.answers as Array<Record<string, unknown>>) ?? [];

    // Determina se é questão normal ou extra (degrau)
    const isExtraQ = qIdx >= shuffleOrder.length;
    let isCorrect = false;
    let misconceptionCode: string | null = null;
    let skillId: string | null = null;
    let skillCode: string | null = null;
    let activityId: string | null = null;
    let explanation: string | null = null;

    if (isExtraQ) {
      const extra = extraItems[qIdx - shuffleOrder.length];
      if (!extra) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
      const q = extra.questions[0];
      isCorrect = q ? selectedIndex === q.correctIndex : false;
      misconceptionCode = q?.options?.[selectedIndex]?.misconceptionCode ?? null;
      explanation = q?.explanation ?? null;
      skillId = extra.skillId;
      skillCode = extra.skillCode;
      activityId = extra.activityId;
    } else {
      const item = items[shuffleOrder[qIdx] ?? qIdx];
      if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
      const q = item.activity.questions[0];
      isCorrect = q ? selectedIndex === q.correctIndex : false;
      misconceptionCode = q?.options ? formatOpcoes(q.options)[selectedIndex]?.misconceptionCode ?? null : null;
      explanation = q?.explanation ?? null;
      skillId = item.skill.id;
      skillCode = item.skill.code;
      activityId = item.activityId;
    }

    const masteryLevel = isCorrect ? "MASTERED" : "NOT_YET";

    // Grava evento de domínio
    if (skillId) {
      await recordMasteryEvent({
        networkId: ctx.networkId,
        studentId: ctx.studentId,
        skillId,
        level: masteryLevel as "MASTERED" | "NOT_YET",
        source: "DIAGNOSTIC",
      }).catch((err: Error) => console.error("[diagnostico/sessao] recordMasteryEvent:", err.message));
    }

    const newAnswer = {
      qIdx,
      activityId,
      skillCode,
      skillId,
      selectedIndex,
      isCorrect,
      misconceptionCode,
      elapsedMs: elapsed,
      answeredAt: new Date().toISOString(),
    };
    const newAnswers = [...prevAnswers, newAnswer];

    // Aplica degrau se NOT_YET e ainda cabe (questões extras ficam na sessão)
    let newExtraItems = [...extraItems];
    let degrauAplicado = false;
    let degrauSkillCode: string | null = null;

    if (masteryLevel === "NOT_YET" && skillCode && !isExtraQ) {
      // Conta quantas vezes errou esta habilidade
      const errosHabilidade = newAnswers.filter((a) => a.skillCode === skillCode && !a.isCorrect).length;
      const totalItens = items.length + newExtraItems.length;
      const minutosAcum = items.reduce((acc, it) => acc + (it.activity.questions.length * 2), 0) + newExtraItems.length * 2;

      if (errosHabilidade >= 1 && totalItens < 20 && minutosAcum < 25) {
        try {
          const degrauResult = await calcularDegrau({
            networkId: ctx.networkId,
            diagnosticId: session.diagnosticId,
            studentId: ctx.studentId,
            skillCode,
            currentItemCount: totalItens,
            currentMinutes: minutosAcum,
          });

          if (degrauResult.added.length > 0) {
            // Busca questões dos itens do degrau
            for (const added of degrauResult.added) {
              const act = await P.eduActivity.findUnique({
                where: { id: added.activityId },
                include: { questions: { orderBy: { order: "asc" }, take: 1 } },
              });
              if (!act) continue;
              const extraSkill = await P.eduSkill.findUnique({ where: { code: added.skillCode }, select: { id: true } });
              newExtraItems.push({
                activityId: added.activityId,
                skillCode: added.skillCode,
                skillId: extraSkill?.id ?? "",
                degrau: added.degrau,
                questions: act.questions.map((q: { id: string; question: string; options: Opcao[]; correctIndex: number; explanation?: string }) => ({
                  id: q.id,
                  question: q.question,
                  options: formatOpcoes(q.options),
                  correctIndex: q.correctIndex,
                  explanation: q.explanation,
                })),
              });
            }
            degrauAplicado = newExtraItems.length > extraItems.length;
            degrauSkillCode = degrauResult.prereqs[0]?.skillCode ?? null;
          }
        } catch (err) {
          console.error("[diagnostico/sessao] calcularDegrau:", (err as Error).message);
        }
      }
    }

    const totalQuestoes = items.length + newExtraItems.length;
    const nextQ = qIdx + 1;
    const isLast = nextQ >= totalQuestoes;

    if (isLast) {
      // Sessão concluída — grava resultado
      await P.eduAttemptSession.update({
        where: { id: sessionId },
        data: { answers: newAnswers, extraItems: newExtraItems, completedAt: new Date(), lastActivityAt: new Date() },
      });

      // Calcula habilidades em NOT_YET para atribuição da trilha
      // Agrupa por skillId: 1 de 2 certas = PARTIAL, 0 de 2 = NOT_YET
      const skillAnswers: Record<string, { certas: number; total: number; skillId: string }> = {};
      for (const a of newAnswers) {
        if (!a.skillId || !a.skillCode) continue;
        const key = a.skillCode as string;
        if (!skillAnswers[key]) skillAnswers[key] = { certas: 0, total: 0, skillId: a.skillId as string };
        skillAnswers[key].total++;
        if (a.isCorrect) skillAnswers[key].certas++;
      }

      // Habilidades do degrau determinam a habilidade de partida
      const degrauSkillIds = newExtraItems.map((e) => e.skillId).filter(Boolean);
      const startSkillId = degrauSkillIds[degrauSkillIds.length - 1] ?? null; // mais básica = último degrau

      const notYetSkillIds: string[] = [];
      const dominaSkillIds: string[] = [];
      const quaseLaSkillIds: string[] = [];

      for (const [, v] of Object.entries(skillAnswers)) {
        if (v.certas === 0) notYetSkillIds.push(v.skillId);
        else if (v.certas < v.total) quaseLaSkillIds.push(v.skillId);
        else dominaSkillIds.push(v.skillId);
      }

      // Inclui habilidades do degrau como NOT_YET (mais básica primeiro)
      const todasNotYet = Array.from(new Set([...(startSkillId ? [startSkillId] : []), ...degrauSkillIds.slice(0, -1).reverse(), ...notYetSkillIds]));

      // Atribuição de trilha: sempre AUTO, sempre aguardada
      let trilhaAtribuida: { id: string; title: string; primeiraAtividadeId: string | null } | null = null;
      if (todasNotYet.length > 0) {
        try {
          const assignResult = await assignAfterDiagnostic({
            networkId: ctx.networkId,
            diagnosticId: session.diagnosticId,
            studentId: ctx.studentId,
            notYetSkillIds: todasNotYet,
            assignedBy: "system",
          });
          // Busca trilha atribuída para retornar na resposta
          if (assignResult.atribuidos > 0) {
            const detalhe = assignResult.detalhes.find((d) => d.acao === "atribuido");
            if (detalhe?.trackId) {
              const track = await P.eduTrack.findUnique({
                where: { id: detalhe.trackId },
                include: { items: { orderBy: { order: "asc" }, take: 1 } },
              });
              if (track) {
                trilhaAtribuida = {
                  id: track.id,
                  title: track.title,
                  primeiraAtividadeId: track.items[0]?.activityId ?? null,
                };
              }
            }
          }
        } catch (err) {
          console.error("[diagnostico/sessao] assignAfterDiagnostic:", (err as Error).message);
        }
      }

      // Busca erro mais comum para mostrar ao aluno
      const erroCounts: Record<string, number> = {};
      for (const a of newAnswers) {
        if (a.misconceptionCode) erroCounts[a.misconceptionCode as string] = (erroCounts[a.misconceptionCode as string] ?? 0) + 1;
      }
      const erroMaisComum = Object.entries(erroCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return NextResponse.json({
        concluido: true,
        totalQuestoes,
        resultado: {
          domina: dominaSkillIds,
          quaseLa: quaseLaSkillIds,
          aindaNao: notYetSkillIds,
          degrauPath: newExtraItems.map((e) => e.skillCode),
          habilidadePartida: startSkillId,
          erroComum: erroMaisComum,
          corretas: newAnswers.filter((a) => a.isCorrect).length,
          total: newAnswers.length,
        },
        trilha: trilhaAtribuida,
        degrauAplicado,
      });
    }

    // Próxima questão
    await P.eduAttemptSession.update({
      where: { id: sessionId },
      data: { answers: newAnswers, extraItems: newExtraItems, currentQuestion: nextQ, lastActivityAt: new Date() },
    });

    // Busca dados da próxima questão
    const isNextExtra = nextQ >= shuffleOrder.length;
    let nextAtividade;

    if (isNextExtra) {
      const extra = newExtraItems[nextQ - shuffleOrder.length];
      nextAtividade = extra ? {
        id: extra.activityId,
        type: "QUIZ",
        prompt: extra.questions[0]?.question ?? "",
        questions: extra.questions.map((q) => ({ id: q.id, question: q.question, options: q.options })),
        skillCode: extra.skillCode,
        isDegrau: true,
      } : null;
    } else {
      const item = items[shuffleOrder[nextQ] ?? nextQ];
      nextAtividade = item ? {
        id: item.activity.id,
        type: item.activity.type,
        prompt: item.activity.prompt,
        questions: item.activity.questions.map((q) => ({ id: q.id, question: q.question, options: formatOpcoes(q.options) })),
        skillCode: item.skill.code,
      } : null;
    }

    return NextResponse.json({
      concluido: false,
      questaoAtual: nextQ + 1,
      totalQuestoes,
      degrauAplicado,
      degrauSkillCode,
      atividade: nextAtividade,
      retorno: {
        isCorrect,
        explanation,
        misconceptionCode,
      },
    });
  }

  return NextResponse.json({ error: "action inválida (iniciar|responder)" }, { status: 400 });
}
