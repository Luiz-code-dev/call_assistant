/**
 * POST /api/escola/professor/aulas/sugerir-objetivos
 * L9: Sugere até 3 objetivos de aula com IA a partir do tema e das habilidades.
 * Nenhum dado de aluno vai para a IA.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const InputSchema = z.object({
  title: z.string().min(3).max(200),
  skillCodes: z.array(z.string()).min(1).max(5),
  gradeYear: z.number().int().min(1).max(9),
  subjectName: z.string().min(2).max(80),
});

const OutputSchema = z.object({
  objectives: z.array(z.object({
    text: z.string(),
    skillCode: z.string().optional(),
  })).min(1).max(5),
});

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const raw = await req.json().catch(() => ({}));
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });

  const { title, skillCodes, gradeYear, subjectName } = parsed.data;

  // Prompt sem nenhum dado de aluno
  const prompt = `Você é um especialista em ${subjectName} para o ${gradeYear}º ano do Ensino Fundamental.

Para a aula com o tema "${title}" e as habilidades BNCC ${skillCodes.join(", ")}, sugira de 2 a 3 objetivos de aprendizagem claros e mensuráveis.

Regras:
- Use verbos de ação no infinitivo (identificar, calcular, resolver, comparar, justificar, etc.)
- Adequados para ${gradeYear}º ano
- Cada objetivo deve estar ligado a uma das habilidades

Responda APENAS com JSON:
{
  "objectives": [
    { "text": "objetivo 1", "skillCode": "EF06MA01" },
    { "text": "objetivo 2", "skillCode": "EF06MA02" }
  ]
}`;

  try {
    const openai = getOpenAI();
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    const validated = OutputSchema.safeParse(raw);
    if (!validated.success)
      return NextResponse.json({ error: "Resposta da IA em formato inesperado" }, { status: 502 });

    return NextResponse.json({ objectives: validated.data.objectives });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao chamar IA" }, { status: 500 });
  }
}
