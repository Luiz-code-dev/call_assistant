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
import { apagarDadosPessoais } from "@/lib/escola/dever";
import { atividadeDoAluno, anoDaTurma } from "@/lib/escola/ajudante-atividade";
import { moderateText, ModerationError } from "@/lib/escola/ai-gateway";
import { getOpenAI } from "@/lib/openai";
import {
  promptDoAjudante, historicoSeguro, travaDaResposta, dicaSemIA, dentroDoLimiteAjudante,
  type AtividadeParaAjudante,
} from "@/lib/escola/ajudante";

export const runtime = "nodejs";

const schema = z.object({
  activityId: z.string().min(1).max(64).optional(),
  // Foto do dever: o enunciado que o Flow leu da foto (sem nomes), no lugar de uma atividade
  dever: z.object({
    enunciado: z.string().min(3).max(3000),
    materia: z.string().max(40).nullish(),
    // Ano escolar estimado pela leitura da foto: o dever pode ser de outro ano que a turma do reforço
    ano: z.number().int().min(1).max(9).nullish(),
  }).optional(),
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

  let atividade: AtividadeParaAjudante | null = null;
  if (parsed.data.activityId) {
    atividade = await atividadeDoAluno(ctx, parsed.data.activityId);
  } else if (parsed.data.dever) {
    // O aluno pode ter corrigido o texto lido: apaga o nome dele e dados pessoais de novo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
    const aluno = await (prismaEdu as any).eduStudent.findUnique({ where: { id: ctx.studentId }, select: { fullName: true } }).catch(() => null);
    const enunciado = apagarDadosPessoais(parsed.data.dever.enunciado, aluno?.fullName ?? "");
    try { await moderateText(enunciado); } catch (e) {
      if (e instanceof ModerationError) return NextResponse.json({ resposta: "Vamos falar só sobre o dever da escola, combinado?" });
    }
    atividade = {
      titulo: "Dever de casa da escola", enunciado, tipo: "WRITTEN",
      materia: parsed.data.dever.materia ?? null,
      anoEscolar: parsed.data.dever.ano ?? await anoDaTurma(ctx),
      perguntas: [],
    };
  }
  if (!atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

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
