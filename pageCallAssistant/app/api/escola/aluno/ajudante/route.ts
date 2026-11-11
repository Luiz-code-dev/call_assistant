/**
 * POST /api/escola/aluno/ajudante
 * { activityId, mensagens: [{ de: "aluno" | "flow", texto }] } -> { resposta }
 *
 * O Flow ajuda o aluno a pensar durante a atividade, sem dar a resposta.
 * A IA recebe só a atividade (sem gabarito) e a conversa: nunca o nome nem a matrícula.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { textosDasOpcoes } from "@/lib/escola/opcoes-aluno";
import { moderateText, ModerationError } from "@/lib/escola/ai-gateway";
import { getOpenAI } from "@/lib/openai";
import {
  promptDoAjudante, historicoSeguro, travaDaResposta, dicaSemIA, dentroDoLimiteAjudante,
  type AtividadeParaAjudante,
} from "@/lib/escola/ajudante";

export const runtime = "nodejs";

const NOMES: Record<string, string> = {
  LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia",
  AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso",
};

const schema = z.object({
  activityId: z.string().min(1).max(64),
  mensagens: z.array(z.object({ de: z.enum(["aluno", "flow"]), texto: z.string().max(2000) })).min(1).max(40),
});

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });
  if (!dentroDoLimiteAjudante(ctx.studentId)) {
    return NextResponse.json({ resposta: "Você já me chamou bastante nesta hora! Agora tente sozinho um pouquinho. Eu volto daqui a pouco." });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
  const P = prismaEdu as any;
  const classSubjectIds: string[] = await P.eduClassSubject.findMany({
    where: { classId: ctx.classId, networkId: ctx.networkId }, select: { id: true },
  }).then((r: { id: string }[]) => r.map((x) => x.id));

  // Só atividades que o aluno pode ver: da turma dele ou da biblioteca do reforço
  const act = await P.eduActivity.findFirst({
    where: {
      id: parsed.data.activityId, status: "PUBLISHED",
      OR: [{ classSubjectId: null }, ...(classSubjectIds.length ? [{ classSubjectId: { in: classSubjectIds }, networkId: ctx.networkId }] : [])],
    },
    select: {
      title: true, prompt: true, type: true, subjectCode: true,
      classSubject: { select: { subject: { select: { name: true } } } },
      questions: { orderBy: { order: "asc" }, select: { question: true, options: true } },
    },
  }).catch(() => null);
  if (!act) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  const turma = await P.eduClass.findUnique({ where: { id: ctx.classId }, select: { gradeYear: true } }).catch(() => null);
  const atividade: AtividadeParaAjudante = {
    titulo: act.title,
    enunciado: act.prompt ?? "",
    tipo: act.type,
    materia: act.classSubject?.subject?.name ?? (act.subjectCode ? NOMES[act.subjectCode] ?? null : null),
    anoEscolar: turma?.gradeYear ?? null,
    perguntas: act.type === "QUIZ"
      ? act.questions.map((q: { question: string; options: unknown }) => ({ pergunta: q.question, opcoes: textosDasOpcoes(q.options) }))
      : [],
  };

  const historico = historicoSeguro(parsed.data.mensagens);
  const ultima = [...historico].reverse().find((m) => m.de === "aluno");
  if (!ultima) return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ resposta: dicaSemIA(ultima.texto, atividade) });

  try {
    await moderateText(ultima.texto);
  } catch (e) {
    if (e instanceof ModerationError) {
      return NextResponse.json({ resposta: "Vamos falar só sobre a atividade, combinado? Se alguma coisa estiver te deixando triste ou com medo, conte para alguém da sua família ou para a professora." });
    }
  }

  try {
    const res = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 220,
      messages: [
        { role: "system", content: promptDoAjudante(atividade) },
        ...historico.map((m) => ({ role: m.de === "aluno" ? "user" as const : "assistant" as const, content: m.texto })),
      ],
    });
    const resposta = travaDaResposta(res.choices[0]?.message?.content ?? "", atividade.tipo);
    return NextResponse.json({ resposta });
  } catch (err) {
    console.error("[aluno/ajudante]", (err as Error).message);
    return NextResponse.json({ resposta: dicaSemIA(ultima.texto, atividade) });
  }
}
