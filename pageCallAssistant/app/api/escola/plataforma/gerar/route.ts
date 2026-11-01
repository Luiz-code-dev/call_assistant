/**
 * POST /api/escola/plataforma/gerar
 * Gera um lote de atividades com IA para um componente/ano/habilidades selecionadas.
 * O conteúdo sempre entra como reviewStatus=IN_REVIEW.
 * Nenhum dado de aluno vai para a IA.
 * Replica em todas as bases (conteúdo SpeakFlow, networkId=null).
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getContentReadDb, forEachContentDb } from "@/lib/escola/conteudo-plataforma";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  try {
    const readDb = await getContentReadDb();

    // Busca as habilidades na base de referência
    const skills = await (readDb as any).eduSkill.findMany({
      where: { code: { in: skillCodes }, subjectCode },
      select: { id: true, code: true, description: true, shortLabel: true },
    });

    if (!skills.length)
      return NextResponse.json({ error: "Nenhuma habilidade encontrada" }, { status: 404 });

    const openai = getOpenAI();
    const generated: Array<{ skillCode: string; activityId: string }> = [];
    const errors: Array<{ skillCode: string; error: string }> = [];

    const subjectLabel = subjectCode === "MA" ? "Matemática" : subjectCode === "LP" ? "Língua Portuguesa" : subjectCode;

    for (const skill of skills) {
      try {
        const prompt = `Você é um pedagogo especialista em ${subjectLabel} para o ${gradeYear}º ano do Ensino Fundamental.

Crie uma atividade de quiz com 4 questões de múltipla escolha para a habilidade BNCC:
Código: ${skill.code}
Descrição: ${skill.description}

Regras:
- 4 questões, cada uma com 4 alternativas
- 1 alternativa correta por questão
- Alternativas erradas representam erros conceituais comuns (inclua misconceptionCode: string breve)
- Linguagem adequada para ${gradeYear}º ano do EF
- Inclua explicação da resposta correta

Responda APENAS com JSON válido neste formato:
{
  "title": "Título da atividade",
  "questions": [
    {
      "question": "texto da questão",
      "options": [
        {"text": "opção correta", "misconceptionCode": null},
        {"text": "opção errada 1", "misconceptionCode": "ERRO_1"},
        {"text": "opção errada 2", "misconceptionCode": "ERRO_2"},
        {"text": "opção errada 3", "misconceptionCode": "ERRO_3"}
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

        // ID estável: mesmo id em todas as bases (gerado uma vez antes do loop de bases)
        const stableId = `SF-ACT-${skill.code}-GEN-${Date.now()}`;

        // Replica em todas as bases
        await forEachContentDb(async (db) => {
          // Idempotente: se já existe, pula
          const exists = await (db as any).eduActivity.findUnique({ where: { id: stableId }, select: { id: true } });
          if (exists) return;

          await (db as any).eduActivity.create({
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
              // maxScore removido — pertence ao módulo de notas
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
        });

        generated.push({ skillCode: skill.code, activityId: stableId });
      } catch (e) {
        errors.push({ skillCode: skill.code, error: (e as Error).message });
      }
    }

    return NextResponse.json({
      generated,
      errors,
      message: `${generated.length} atividade(s) gerada(s) e enviada(s) para revisão.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
