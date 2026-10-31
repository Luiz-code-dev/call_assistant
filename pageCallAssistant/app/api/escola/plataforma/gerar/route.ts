/**
 * POST /api/escola/plataforma/gerar
 * Gera um lote de atividades com IA para um componente/ano/habilidades selecionadas.
 * O conteúdo sempre entra como reviewStatus=IN_REVIEW.
 * Nenhum dado de aluno vai para a IA.
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

const P = prismaEdu as any;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { skillCodes, subjectCode, gradeYear } = body as {
    skillCodes: string[];
    subjectCode: string;
    gradeYear: number;
  };

  if (!skillCodes?.length || !subjectCode || !gradeYear)
    return NextResponse.json({ error: "skillCodes, subjectCode e gradeYear obrigatórios" }, { status: 400 });

  if (skillCodes.length > 10)
    return NextResponse.json({ error: "Máximo 10 habilidades por lote" }, { status: 400 });

  // Busca as habilidades
  const skills = await P.eduSkill.findMany({
    where: { code: { in: skillCodes }, subjectCode },
    select: { id: true, code: true, description: true, shortLabel: true },
  });

  if (!skills.length)
    return NextResponse.json({ error: "Nenhuma habilidade encontrada" }, { status: 404 });

  const openai = getOpenAI();
  const generated: Array<{ skillCode: string; activityId: string }> = [];
  const errors: Array<{ skillCode: string; error: string }> = [];

  for (const skill of skills) {
    try {
      const prompt = `Você é um pedagogo especialista em ${subjectCode === "MA" ? "Matemática" : "Linguagens"} para o ${gradeYear}º ano do Ensino Fundamental.

Crie uma atividade de quiz com 4 questões de múltipla escolha para a habilidade BNCC:
Código: ${skill.code}
Descrição: ${skill.description}

Regras:
- 4 questões, cada uma com 4 alternativas (A, B, C, D)
- 1 alternativa correta por questão
- As alternativas erradas devem representar erros conceituais comuns (inclua misconceptionCode: string breve)
- Linguagem adequada para ${gradeYear}º ano
- Inclua explicação da resposta correta

Responda APENAS com JSON válido neste formato:
{
  "title": "Título da atividade",
  "questions": [
    {
      "question": "texto da questão",
      "options": [
        {"text": "opção A", "misconceptionCode": null},
        {"text": "opção B (errada)", "misconceptionCode": "ERRO_TIPO_1"},
        {"text": "opção C", "misconceptionCode": null},
        {"text": "opção D (errada)", "misconceptionCode": "ERRO_TIPO_2"}
      ],
      "correctIndex": 0,
      "explanation": "Explicação da resposta correta"
    }
  ]
}`;

      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
      if (!raw.questions?.length) throw new Error("IA não gerou questões");

      // Cria a atividade como DRAFT (reviewStatus=IN_REVIEW)
      const stableId = `SF-ACT-${skill.code}-GEN-${Date.now()}`;
      const activity = await P.eduActivity.create({
        data: {
          id: stableId,
          networkId: null,
          title: raw.title ?? `Atividade ${skill.code}`,
          prompt: `Quiz gerado por IA para habilidade ${skill.code}`,
          type: "QUIZ",
          status: "DRAFT",
          reviewStatus: "IN_REVIEW",
          source: "SPEAKFLOW",
          subjectCode,
          gradeYears: [gradeYear],
          skillIds: [skill.id],
          maxScore: 10,
          maxAttempts: 2,
          estMinutes: 10,
          version: 1,
          questions: {
            create: raw.questions.map((q: any, i: number) => ({
              order: i + 1,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
              skillId: skill.id,
            })),
          },
        },
      });
      generated.push({ skillCode: skill.code, activityId: activity.id });
    } catch (e) {
      errors.push({ skillCode: skill.code, error: (e as Error).message });
    }
  }

  return NextResponse.json({
    generated,
    errors,
    message: `${generated.length} atividade(s) gerada(s) e enviada(s) para revisão.`,
  });
}
