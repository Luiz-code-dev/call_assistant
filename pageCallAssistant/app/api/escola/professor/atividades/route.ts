import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { suggestActivity } from "@/lib/escola/ai-gateway";
import { assertCanManageClassSubject } from "@/lib/escola/permissions";
import { z } from "zod";

export const runtime = "nodejs";

// A5: papéis que podem acessar atividades de professor
const ALLOWED_ROLES = new Set(["TEACHER", "COORDINATOR", "NETWORK_ADMIN", "SCHOOL_ADMIN"]);

// C: validação Zod para suggestActivity output
const SuggestOutputSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  rubric: z.object({
    criterios: z.array(z.object({
      criterio: z.string(),
      peso: z.number().min(0.01).max(1),
      descricao: z.string().optional(),
    })).min(2).max(4).refine(
      (cs) => Math.abs(cs.reduce((s, c) => s + c.peso, 0) - 1) < 0.01,
      { message: "Pesos devem somar 1" },
    ),
  }).optional(),
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).min(2).max(5),
    correctIndex: z.number().int().min(0),
    explanation: z.string().optional(),
  })).optional(),
});

// GET — lista atividades do professor nessa turma/componente
export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || !ALLOWED_ROLES.has(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classSubjectId = searchParams.get("classSubjectId");

  // A5: TEACHER vê apenas atividades das suas turmas
  const teacherFilter = ctx.role === "TEACHER" ? { classSubject: { teacherId: ctx.userId } } : {};

  const activities = await (prismaEdu as any).eduActivity.findMany({
    where: {
      networkId: ctx.networkId,
      ...(classSubjectId ? { classSubjectId } : {}),
      ...teacherFilter,
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: { where: { status: { not: "IN_PROGRESS" } } } } },
      questions: { select: { id: true }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ atividades: activities });
}

// POST — cria nova atividade
export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || !ALLOWED_ROLES.has(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();

  // Sugestão IA (retorna sugestão sem salvar) — C: valida output com Zod
  if (body.action === "sugerir") {
    const rawSuggestion = await suggestActivity({
      subjectName: body.subjectName ?? "Português",
      gradeYear: body.gradeYear ?? 6,
      topicTitle: body.topicTitle,
      activityType: body.type ?? "WRITTEN",
    });
    const parsed = SuggestOutputSchema.safeParse(rawSuggestion);
    if (!parsed.success) {
      return NextResponse.json({ error: "Sugestão da IA inválida", details: parsed.error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ suggestion: parsed.data });
  }

  const { classSubjectId, type, title, prompt, rubric, maxScore, maxAttempts, maxAudioSec, dueAt, topicId, assessmentId, status, questions } = body;
  if (!classSubjectId || !type || !title || !prompt || !rubric) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  // A5: Verifica que o professor é dono do classSubject
  const cs = await (prismaEdu as any).eduClassSubject.findFirst({
    where: { id: classSubjectId, networkId: ctx.networkId },
    include: { class: { select: { schoolId: true } } },
  });
  if (!cs) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  try {
    assertCanManageClassSubject(ctx, {
      teacherId: cs.teacherId ?? null,
      networkId: ctx.networkId,
      schoolId: cs.class?.schoolId ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const activity = await (prismaEdu as any).eduActivity.create({
    data: {
      networkId: ctx.networkId,
      classSubjectId,
      topicId: topicId ?? null,
      assessmentId: assessmentId ?? null,
      type,
      title,
      prompt,
      rubric,
      maxScore: maxScore ?? 10,
      maxAttempts: maxAttempts ?? 2,
      maxAudioSec: maxAudioSec ?? null,
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status ?? "DRAFT",
      createdById: ctx.userId,
    },
  });

  if (type === "QUIZ" && Array.isArray(questions) && questions.length > 0) {
    await (prismaEdu as any).eduQuizQuestion.createMany({
      data: questions.map((q: { question: string; options: string[]; correctIndex: number; explanation?: string }, i: number) => ({
        activityId: activity.id,
        order: i + 1,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? null,
      })),
    });
  }

  return NextResponse.json({ activity }, { status: 201 });
}
