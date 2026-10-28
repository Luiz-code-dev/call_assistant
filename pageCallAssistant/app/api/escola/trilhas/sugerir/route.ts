/**
 * POST /api/escola/trilhas/sugerir
 * Gera de 3 a 8 atividades de reforço usando IA.
 * Nunca recebe nome, matrícula ou id de aluno — só componente, ano e habilidades.
 * Nada é gravado no banco até o professor salvar a trilha.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";
import { moderateText } from "@/lib/escola/ai-gateway";

const reqSchema = z.object({
  subjectName: z.string().min(1).max(100),
  gradeYear:   z.number().int().min(1).max(9),
  skills:      z.array(z.object({
    code:        z.string(),
    description: z.string(),
  })).min(1).max(3),
});

const itemSchema = z.object({
  order:      z.number().int().min(1).max(8),
  type:       z.enum(["QUIZ","ESCRITA","FALA"]),
  enunciado:  z.string().min(10),
  criterios:  z.string().min(5),
  estMinutes: z.number().int().min(1).max(15),
});

const responseSchema = z.object({
  atividades: z.array(itemSchema).min(3).max(8),
});

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER","COORDINATOR","NETWORK_ADMIN"].includes(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = reqSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { subjectName, gradeYear, skills } = parsed.data;
  const skillsText = skills.map(s => `• ${s.code}: ${s.description}`).join("\n");

  const prompt = `Você é um especialista em elaboração de atividades de reforço escolar para a BNCC.
Crie entre 3 e 8 atividades de reforço em ordem crescente de dificuldade para:
- Componente: ${subjectName}
- Ano/Série: ${gradeYear}º ano
- Habilidades:
${skillsText}

Cada atividade deve ter:
- type: QUIZ (múltipla escolha), ESCRITA (resposta aberta) ou FALA (resposta oral)
- enunciado claro e objetivo (linguagem acessível para o ano)
- criterios de correção (para orientar a IA que vai avaliar)
- estMinutes: tempo estimado em minutos (mínimo 3, máximo 15)
- Comece com atividades mais simples (QUIZ) e avance para mais complexas (ESCRITA/FALA)

Regras:
- NÃO mencione nome de aluno, matrícula, escola ou rede
- NÃO use ranking ou percentagem — use níveis: Ainda não, Quase lá, Domina
- Máximo de 8 atividades, mínimo de 3
- Responda SOMENTE com JSON no formato:
{
  "atividades": [
    {"order":1,"type":"QUIZ","enunciado":"...","criterios":"...","estMinutes":5},
    ...
  ]
}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = responseSchema.safeParse(JSON.parse(raw));
    if (!data.success) {
      return NextResponse.json({ error: "IA retornou formato inesperado", details: data.error.flatten() }, { status: 502 });
    }

    // Moderação de saída — moderateText lança se conteúdo for inadequado
    try {
      for (const item of data.data.atividades) {
        await moderateText(item.enunciado);
      }
    } catch {
      return NextResponse.json({ error: "Conteúdo inadequado detectado na sugestão da IA" }, { status: 422 });
    }

    return NextResponse.json({ atividades: data.data.atividades });
  } catch {
    return NextResponse.json({ error: "Erro ao chamar a IA. Tente novamente." }, { status: 502 });
  }
}
