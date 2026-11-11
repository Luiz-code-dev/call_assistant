/**
 * POST /api/escola/aluno/ajudante/revisar  { activityId, texto } -> { dica, restantes }
 * "Flow, olha meu texto": UMA dica de melhoria antes de enviar, sem reescrever,
 * sem dizer se está certo e sem nota. A IA recebe só a atividade e o texto (sem nome).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { atividadeDoAluno } from "@/lib/escola/ajudante-atividade";
import { moderateText, ModerationError } from "@/lib/escola/ai-gateway";
import { getOpenAI } from "@/lib/openai";
import { promptDaRevisao, travaDaRevisao, dicaDaRevisaoSemIA, dentroDoLimiteRevisao } from "@/lib/escola/ajudante";

export const runtime = "nodejs";

const schema = z.object({ activityId: z.string().min(1).max(64), texto: z.string().max(6000) });

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
  const texto = parsed.data.texto.trim();
  if (texto.split(/\s+/).filter(Boolean).length < 5) {
    return NextResponse.json({ dica: "Escreva um pouquinho mais primeiro: conte com as suas palavras o que você pensou. Depois eu olho com você!" });
  }

  const atividade = await atividadeDoAluno(ctx, parsed.data.activityId);
  if (!atividade || atividade.tipo !== "WRITTEN") return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  if (!dentroDoLimiteRevisao(`${ctx.studentId}:${atividade.id}`)) {
    return NextResponse.json({ dica: "Já olhamos juntos três vezes! Agora confie em você: releia com calma e envie quando achar que está bom.", restantes: 0 });
  }

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ dica: dicaDaRevisaoSemIA(texto) });

  try {
    await moderateText(texto);
  } catch (e) {
    if (e instanceof ModerationError) return NextResponse.json({ dica: "Vamos escrever só sobre a atividade, combinado? Releia o enunciado e tente de novo." });
  }

  try {
    const res = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.4, max_tokens: 180,
      messages: [
        { role: "system", content: promptDaRevisao(atividade) },
        { role: "user", content: `Texto do aluno:\n${texto.slice(0, 4000)}` },
      ],
    });
    return NextResponse.json({ dica: travaDaRevisao(res.choices[0]?.message?.content ?? "", texto) });
  } catch (err) {
    console.error("[aluno/ajudante/revisar]", (err as Error).message);
    return NextResponse.json({ dica: dicaDaRevisaoSemIA(texto) });
  }
}
