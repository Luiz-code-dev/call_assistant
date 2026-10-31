/**
 * POST /api/escola/professor/aulas/gerar-perguntas
 * Gera 3-8 perguntas com IA a partir de objetivos e habilidades de uma aula.
 * NENHUM dado de aluno vai para a IA.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Somente professores" }, { status: 403 });

  const body = await req.json();
  const { title, objectives, skillCodes, gradeYear, subjectName, count = 5 } = body as {
    title: string;
    objectives: string[];
    skillCodes: string[];
    gradeYear: number;
    subjectName: string;
    count?: number;
  };

  if (!title || !objectives?.length)
    return NextResponse.json({ error: "title e objectives obrigatórios" }, { status: 400 });

  const n = Math.min(Math.max(3, Number(count) || 5), 8);

  const openai = getOpenAI();

  const prompt = `Você é um pedagogo de ${subjectName ?? "Educação"} para o ${gradeYear ?? ""}º ano do Ensino Fundamental.

Aula: "${title}"
Objetivos:
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Habilidades BNCC relacionadas: ${skillCodes?.join(", ") ?? "não informadas"}

Crie ${n} questões de múltipla escolha para verificar se os alunos atingiram os objetivos.

Regras:
- Nenhum dado pessoal de aluno
- 4 alternativas por questão (A, B, C, D)
- 1 correta, 3 erradas representando erros conceituais comuns
- Inclua misconceptionCode curto para cada alternativa errada (ex: "INVERTE_OP", "CONFUNDE_UNIDADE")
- Linguagem adequada ao ano escolar
- Inclua explicação da resposta correta

Responda APENAS com JSON:
{
  "questions": [
    {
      "question": "texto",
      "objectiveIndex": 0,
      "options": [
        {"text": "opção A", "misconceptionCode": null},
        {"text": "opção B errada", "misconceptionCode": "ERRO_1"},
        {"text": "opção C errada", "misconceptionCode": "ERRO_2"},
        {"text": "opção D errada", "misconceptionCode": "ERRO_3"}
      ],
      "correctIndex": 0,
      "explanation": "texto"
    }
  ]
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    const questions = raw.questions ?? [];
    // Gabarito nunca vai ao navegador antes da entrega — retornar apenas o índice correto
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao gerar perguntas", detail: (e as Error).message }, { status: 500 });
  }
}
