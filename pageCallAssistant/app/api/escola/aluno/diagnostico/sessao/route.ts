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
import { calcularDegrau, deveDescerDegrau } from "@/lib/escola/diagnostico-degrau";
import { questaoParaAluno } from "@/lib/escola/opcoes-aluno";
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
  /** Habilidade cujo erro gerou este degrau */
  fromSkillCode?: string;
  questions: Array<{ id: string; question: string; options: Array<{ text: string; misconceptionCode?: string }>; correctIndex: number; explanation?: string }>;
};

/**
 * Sequência da sessão. shuffleOrder guarda os itens normais (>= 0) e, a partir
 * desta versão, também as questões do degrau como -(k + 1), inseridas logo depois
 * da questão errada. Sessões antigas tinham o degrau só no fim: os extras que
 * não estão em shuffleOrder vão para o fim, como antes.
 */
type Posicao = { tipo: "normal"; item: number } | { tipo: "extra"; extra: number };
function posicoes(seq: number[], extrasLen: number): Posicao[] {
  const pos: Posicao[] = seq.map((e) => (e >= 0 ? { tipo: "normal", item: e } : { tipo: "extra", extra: -e - 1 }));
  const usados = new Set(seq.filter((e) => e < 0).map((e) => -e - 1));
  for (let k = 0; k < extrasLen; k++) if (!usados.has(k)) pos.push({ tipo: "extra", extra: k });
  return pos;
}

type ItemNormal = { activityId: string; skill: { id: string; code: string }; activity: { id: string; type: string; prompt: string; questions: Array<{ id: string; question: string; options: Opcao[]; correctIndex: number; explanation?: string }> } };

/** Atividade da posição, já sem correctIndex e sem misconceptionCode */
function atividadeParaAluno(p: Posicao | undefined, items: ItemNormal[], extras: ExtraItem[]) {
  if (!p) return null;
  if (p.tipo === "extra") {
    const extra = extras[p.extra];
    return extra ? {
      id: extra.activityId,
      type: "QUIZ",
      prompt: "", // a questão já traz o enunciado
      questions: extra.questions.map(questaoParaAluno),
      skillCode: extra.skillCode,
      isDegrau: true,
    } : null;
  }
  const item = items[p.item];
  return item ? {
    id: item.activity.id,
    type: item.activity.type,
    prompt: promptParaAluno(item.activity.prompt, item.activity.questions[0]?.question),
    questions: item.activity.questions.map(questaoParaAluno),
    skillCode: item.skill.code,
  } : null;
}

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
      const extraItems = (existing.extraItems ?? []) as ExtraItem[];
      const pos = posicoes(existing.shuffleOrder as number[], extraItems.length);
      const idx = existing.currentQuestion;
      const atividade = atividadeParaAluno(pos[idx], items, extraItems);
      return NextResponse.json({ sessionId: existing.id, questaoAtual: idx + 1, totalQuestoes: pos.length, atividade, retomada: true });
    }

    const seed = Date.now() & 0xffffffff;
    const shuffleOrder = shuffleWithSeed(Array.from({ length: items.length }, (_, i) => i), seed);
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);

    const dadosNovos = {
      currentQuestion: 0,
      shuffleOrder,
      extraItems: [],
      answers: [],
      minMsPerQuestion: MIN_MS_PER_Q,
      expiresAt,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };
    // Sessão incompleta que expirou: recomeça nela. Criar outra violaria o
    // @@unique([studentId, activityId, diagnosticId]) e a rota respondia 500.
    const session = existing
      ? await P.eduAttemptSession.update({ where: { id: existing.id }, data: dadosNovos })
      : await P.eduAttemptSession.create({
          data: {
            networkId: ctx.networkId,
            studentId: ctx.studentId,
            activityId: items[0].activityId,
            diagnosticId,
            ...dadosNovos,
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
        prompt: promptParaAluno(first.activity.prompt, first.activity.questions[0]?.question),
        questions: first.activity.questions.map(questaoParaAluno),
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

    const items = diag.items as ItemNormal[];
    const shuffleOrder = session.shuffleOrder as number[];
    const extraItems = (session.extraItems ?? []) as ExtraItem[];
    const qIdx = session.currentQuestion;
    const prevAnswers = (session.answers as Array<Record<string, unknown>>) ?? [];
    const posAtual = posicoes(shuffleOrder, extraItems.length)[qIdx];
    if (!posAtual) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

    // Questão normal ou extra (degrau)
    let isCorrect = false;
    let misconceptionCode: string | null = null;
    let skillId: string | null = null;
    let skillCode: string | null = null;
    let activityId: string | null = null;
    let explanation: string | null = null;
    let nivelAtual = 0;

    if (posAtual.tipo === "extra") {
      const extra = extraItems[posAtual.extra];
      if (!extra) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
      nivelAtual = extra.degrau;
      const q = extra.questions[0];
      isCorrect = q ? selectedIndex === q.correctIndex : false;
      misconceptionCode = q?.options?.[selectedIndex]?.misconceptionCode ?? null;
      explanation = q?.explanation ?? null;
      skillId = extra.skillId;
      skillCode = extra.skillCode;
      activityId = extra.activityId;
    } else {
      const item = items[posAtual.item];
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
      // Fica só na sessão (servidor): usado no texto do erro comum do resultado
      explanation,
      elapsedMs: elapsed,
      answeredAt: new Date().toISOString(),
    };
    const newAnswers = [...prevAnswers, newAnswer];

    // Degrau: questões do pré-requisito entram logo depois desta (ficam só na sessão do aluno)
    const newExtraItems = [...extraItems];
    const newShuffleOrder = [...shuffleOrder];
    let degrauAplicado = false;
    let degrauSkillCode: string | null = null;

    const totalAntes = posicoes(shuffleOrder, extraItems.length).length;
    const descer = !!skillCode && deveDescerDegrau({
      acertou: isCorrect,
      temErroComum: !!misconceptionCode,
      errosNaHabilidade: newAnswers.filter((a) => a.skillCode === skillCode && !a.isCorrect).length,
      nivelAtual,
      jaDesceuDestaHabilidade: extraItems.some((e) => e.fromSkillCode === skillCode),
    });

    if (descer && skillCode && totalAntes < 20) try {
      const degrauResult = await calcularDegrau({
        networkId: ctx.networkId,
        diagnosticId: session.diagnosticId,
        studentId: ctx.studentId,
        skillCode,
        nivel: nivelAtual + 1,
        currentItemCount: totalAntes,
        currentMinutes: totalAntes * 2,
        excluirActivityIds: [...items.map((i) => i.activityId), ...extraItems.map((e) => e.activityId)],
      });

      const novos: number[] = [];
      for (const added of degrauResult.added) {
        const act = await P.eduActivity.findUnique({
          where: { id: added.activityId },
          include: { questions: { orderBy: { order: "asc" }, take: 1 } },
        });
        if (!act?.questions?.length) {
          console.error(`[diagnostico/sessao] degrau: atividade ${added.activityId} sem questão (habilidade ${added.skillCode})`);
          continue;
        }
        const prereq = degrauResult.prereqs.find((pr) => pr.skillCode === added.skillCode);
        newExtraItems.push({
          activityId: added.activityId,
          skillCode: added.skillCode,
          skillId: prereq?.skillId ?? "",
          degrau: added.degrau,
          fromSkillCode: skillCode,
          // Guardado só no servidor: inclui correctIndex e misconceptionCode
          questions: act.questions.map((q: { id: string; question: string; options: Opcao[]; correctIndex: number; explanation?: string }) => ({
            id: q.id,
            question: q.question,
            options: formatOpcoes(q.options),
            correctIndex: q.correctIndex,
            explanation: q.explanation,
          })),
        });
        novos.push(-(newExtraItems.length - 1) - 1);
      }
      if (novos.length > 0) {
        // Sessões antigas guardavam o degrau só no fim; aqui os extras passam a fazer parte da sequência
        const legados = posicoes(shuffleOrder, extraItems.length).slice(shuffleOrder.length)
          .map((p) => (p.tipo === "extra" ? -p.extra - 1 : p.item));
        newShuffleOrder.push(...legados);
        // Entra logo depois desta questão; se ela é de um degrau, depois das outras do mesmo degrau
        let inserirEm = qIdx + 1;
        if (posAtual.tipo === "extra") {
          const grupo = newExtraItems[posAtual.extra];
          while (inserirEm < newShuffleOrder.length) {
            const e = newShuffleOrder[inserirEm];
            const vizinho = e < 0 ? newExtraItems[-e - 1] : null;
            if (!vizinho || vizinho.skillCode !== grupo.skillCode || vizinho.fromSkillCode !== grupo.fromSkillCode) break;
            inserirEm++;
          }
        }
        newShuffleOrder.splice(inserirEm, 0, ...novos);
        degrauAplicado = true;
        degrauSkillCode = degrauResult.prereqs[0]?.skillCode ?? null;
      } else {
        console.error(`[diagnostico/sessao] degrau sem questões para ${skillCode} (diagnóstico ${session.diagnosticId})`);
      }
    } catch (err) {
      // A resposta do aluno continua valendo; o degrau desta questão fica de fora
      console.error(`[diagnostico/sessao] degrau falhou para ${skillCode} (diagnóstico ${session.diagnosticId}, sessão ${sessionId}):`, (err as Error).message);
    }

    const novasPosicoes = posicoes(newShuffleOrder, newExtraItems.length);
    const totalQuestoes = novasPosicoes.length;
    const nextQ = qIdx + 1;
    const isLast = nextQ >= totalQuestoes;

    if (isLast) {
      // Sessão concluída — grava resultado
      await P.eduAttemptSession.update({
        where: { id: sessionId },
        data: { answers: newAnswers, extraItems: newExtraItems, shuffleOrder: newShuffleOrder, completedAt: new Date(), lastActivityAt: new Date() },
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

      // Cadeia do degrau, da mais básica (degrau maior) para a mais avançada,
      // só com as habilidades em que o aluno errou alguma questão
      const porSkillId = Object.fromEntries(Object.values(skillAnswers).map((v) => [v.skillId, v]));
      const degrauSkillIds = Array.from(new Set(
        [...newExtraItems].sort((a, b) => b.degrau - a.degrau).map((e) => e.skillId).filter(Boolean)
      )).filter((id) => porSkillId[id] && porSkillId[id].certas < porSkillId[id].total);
      // Habilidade de partida: a mais básica em NOT_YET na cadeia do degrau
      const startSkillId = degrauSkillIds.find((id) => porSkillId[id].certas === 0) ?? degrauSkillIds[0] ?? null;

      const notYetSkillIds: string[] = [];
      const dominaSkillIds: string[] = [];
      const quaseLaSkillIds: string[] = [];

      for (const [, v] of Object.entries(skillAnswers)) {
        if (v.certas === 0) notYetSkillIds.push(v.skillId);
        else if (v.certas < v.total) quaseLaSkillIds.push(v.skillId);
        else dominaSkillIds.push(v.skillId);
      }

      // Inclui habilidades do degrau como NOT_YET (mais básica primeiro)
      const todasNotYet = Array.from(new Set([...(startSkillId ? [startSkillId] : []), ...degrauSkillIds, ...notYetSkillIds]));

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

      // Erro mais comum: o aluno vê a explicação da questão (nunca o código)
      const erroCounts: Record<string, number> = {};
      for (const a of newAnswers) {
        if (a.misconceptionCode) erroCounts[a.misconceptionCode as string] = (erroCounts[a.misconceptionCode as string] ?? 0) + 1;
      }
      const erroMaisComum = Object.entries(erroCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const erroComum = await textoDoErroComum(erroMaisComum, newAnswers);

      // Nomes das habilidades em linguagem de aluno (nunca o código BNCC)
      const nomes = await nomesDasHabilidades(Object.values(skillAnswers).map((v) => v.skillId));
      const comNivel = (ids: string[], nivel: "AINDA_NAO" | "QUASE_LA" | "DOMINA") =>
        ids.map((id) => nomes[id]).filter(Boolean).map((h) => ({ ...h, nivel }));
      // Caminho do degrau, do ano do aluno até a base: ex. 6º > 5º > 4º
      const idPorCode: Record<string, string> = Object.fromEntries(Object.entries(skillAnswers).map(([code, v]) => [code, v.skillId]));
      const raiz = newExtraItems.find((e) => e.degrau === 1)?.fromSkillCode;
      const cadeiaIds = Array.from(new Set([
        ...(raiz && idPorCode[raiz] ? [idPorCode[raiz]] : []),
        ...newExtraItems.slice().sort((x, y) => x.degrau - y.degrau).map((e) => e.skillId),
      ].filter(Boolean)));
      const cadeia = cadeiaIds.map((id) => nomes[id]).filter(Boolean);

      return NextResponse.json({
        concluido: true,
        totalQuestoes,
        resultado: {
          domina: comNivel(dominaSkillIds, "DOMINA"),
          quaseLa: comNivel(quaseLaSkillIds, "QUASE_LA"),
          aindaNao: comNivel(notYetSkillIds, "AINDA_NAO"),
          degrau: cadeia,
          habilidadePartida: startSkillId ? nomes[startSkillId] ?? null : null,
          erroComum,
        },
        trilha: trilhaAtribuida,
        degrauAplicado,
      });
    }

    // Próxima questão
    await P.eduAttemptSession.update({
      where: { id: sessionId },
      data: { answers: newAnswers, extraItems: newExtraItems, shuffleOrder: newShuffleOrder, currentQuestion: nextQ, lastActivityAt: new Date() },
    });

    const nextAtividade = atividadeParaAluno(novasPosicoes[nextQ], items, newExtraItems);

    return NextResponse.json({
      concluido: false,
      questaoAtual: nextQ + 1,
      totalQuestoes,
      degrauAplicado,
      degrauSkillCode,
      atividade: nextAtividade,
      // O código do erro comum fica no servidor (resposta gravada na sessão)
      retorno: {
        isCorrect,
        explanation,
      },
    });
  }

  return NextResponse.json({ error: "action inválida (iniciar|responder)" }, { status: 400 });
}


// ── Textos do resultado para o aluno ────────────────────────────────────────

type HabilidadeAluno = { code: string; tituloAluno: string; ano: number | null };

/** Título da habilidade para o aluno: o da trilha SpeakFlow; sem trilha, o rótulo curto da BNCC. */
async function nomesDasHabilidades(skillIds: string[]): Promise<Record<string, HabilidadeAluno>> {
  const ids = Array.from(new Set(skillIds.filter(Boolean)));
  if (ids.length === 0) return {};
  const skills: Array<{ id: string; code: string; shortLabel: string | null; description: string; gradeYears: number[] }> =
    await P.eduSkill.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, shortLabel: true, description: true, gradeYears: true } });
  const tracks: Array<{ title: string; skillIds: string[]; gradeYear: number | null }> = await P.eduTrack.findMany({
    where: { status: "APPROVED", networkId: null, skillIds: { hasSome: ids } },
    select: { title: true, skillIds: true, gradeYear: true },
  });
  const out: Record<string, HabilidadeAluno> = {};
  for (const s of skills) {
    const t = tracks.find((tr) => tr.skillIds.includes(s.id));
    const titulo = t ? t.title.replace(/^Trilha:\s*/i, "") : (s.shortLabel ?? s.description.split(/[,.;]/)[0]);
    out[s.id] = { code: s.code, tituloAluno: titulo, ano: t?.gradeYear ?? (s.gradeYears.length ? Math.max(...s.gradeYears) : null) };
  }
  return out;
}

/** Texto do erro comum para o aluno: a explicação da questão em que ele errou; senão, a descrição da ficha. */
async function textoDoErroComum(
  code: string | null,
  answers: Array<{ misconceptionCode?: string | null; explanation?: string | null; skillId?: string | null }>,
): Promise<{ texto: string; exemplo: string } | null> {
  if (!code) return null;
  const resp = answers.find((a) => a.misconceptionCode === code && a.explanation);
  if (resp?.explanation) return { texto: resp.explanation, exemplo: "" };
  const skillId = answers.find((a) => a.misconceptionCode === code)?.skillId;
  if (!skillId) return null;
  const guide: { commonErrors: unknown } | null = await P.eduSkillGuide.findFirst({
    where: { skillId, status: "APPROVED", networkId: null },
    select: { commonErrors: true },
  });
  const erros = Array.isArray(guide?.commonErrors) ? (guide!.commonErrors as Array<{ code?: string; description?: string }>) : [];
  const desc = erros.find((e) => e.code === code)?.description;
  return desc ? { texto: `Fique de olho neste erro comum: ${desc.charAt(0).toLowerCase()}${desc.slice(1)}.`, exemplo: "" } : null;
}


/**
 * Texto de apoio acima da questão. Nunca mostra ao aluno o enunciado genérico
 * antigo ("Resolva o problema relacionado a EF06MA03.") nem código BNCC, e não
 * repete o enunciado quando o prompt é igual à própria questão.
 */
function promptParaAluno(prompt: string | null | undefined, question: string | null | undefined): string {
  const p = (prompt ?? "").trim();
  if (!p) return "";
  if (/relacionad[oa] a\s+EF\d/i.test(p) || /\bEF\d{2}[A-Z]{2}\d{2}\b/.test(p)) return "";
  if (question && p === question.trim()) return "";
  return p;
}
