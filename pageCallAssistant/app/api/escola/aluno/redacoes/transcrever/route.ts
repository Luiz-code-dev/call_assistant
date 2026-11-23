/**
 * POST /api/escola/aluno/redacoes/transcrever (multipart: foto) -> { titulo, texto }
 * Lê a redação escrita à mão no caderno, sem corrigir nada, para o aluno conferir antes de enviar.
 * A foto passa só pela moderação e pela leitura e não é guardada. Nome do aluno e dados pessoais
 * são apagados do texto.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { getOpenAI } from "@/lib/openai";
import { moderateText, ModerationError } from "@/lib/escola/ai-gateway";
import { dentroDoLimiteFoto } from "@/lib/escola/ajudante";
import { apagarDadosPessoais } from "@/lib/escola/dever";
import { PROMPT_TRANSCRICAO, lerTranscricao } from "@/lib/escola/redacao";
import { MODELO_REDACAO } from "@/lib/escola/redacao-ia";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  if (!dentroDoLimiteFoto(ctx.studentId)) return NextResponse.json({ error: "Você já mandou muitas fotos nesta hora. Tente de novo mais tarde." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "A leitura de fotos não está disponível agora. Digite o texto." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const fotos = (form?.getAll("foto") ?? []).filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f).slice(0, 3);
  if (!fotos.length) return NextResponse.json({ error: "Não recebi a foto." }, { status: 400 });
  for (const f of fotos) {
    if (!TIPOS.includes(f.type)) return NextResponse.json({ error: "Envie fotos (JPG ou PNG)." }, { status: 415 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: "A foto ficou muito grande. Tente de novo." }, { status: 413 });
  }
  const urls = await Promise.all(fotos.map(async (f) => `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`));
  const openai = getOpenAI();

  try {
    const m = await openai.moderations.create({ model: "omni-moderation-latest", input: urls.map((url) => ({ type: "image_url" as const, image_url: { url } })) });
    if (m.results.some((r) => r.flagged)) return NextResponse.json({ error: "Essa foto não parece uma redação. Fotografe só a folha do texto." }, { status: 422 });
  } catch (err) {
    console.error("[aluno/redacoes/transcrever] moderação:", (err as Error).message);
    return NextResponse.json({ error: "Não consegui ler agora. Tente de novo daqui a pouco." }, { status: 502 });
  }

  let lido: { titulo: string | null; texto: string } | null = null;
  try {
    const r = await openai.chat.completions.create({
      model: MODELO_REDACAO, temperature: 0, max_tokens: 3500, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_TRANSCRICAO },
        {
          role: "user",
          content: [
            { type: "text", text: fotos.length > 1 ? `Transcreva a redação. São ${fotos.length} fotos, em ordem: junte o texto na sequência.` : "Transcreva a redação desta foto." },
            ...urls.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } })),
          ],
        },
      ],
    });
    lido = lerTranscricao(r.choices[0]?.message?.content ?? "");
  } catch (err) {
    console.error("[aluno/redacoes/transcrever] leitura:", (err as Error).message);
    return NextResponse.json({ error: "Não consegui ler agora. Tente de novo daqui a pouco." }, { status: 502 });
  }
  if (!lido) return NextResponse.json({ error: "Não consegui achar uma redação na foto. Fotografe a folha inteira, de cima, com boa luz." }, { status: 422 });

  const aluno = await ctx.db.eduStudent.findFirst({ where: { id: ctx.studentId }, select: { fullName: true } }).catch(() => null);
  const texto = apagarDadosPessoais(lido.texto, aluno?.fullName ?? "");
  try { await moderateText(texto); } catch (e) {
    if (e instanceof ModerationError) return NextResponse.json({ error: "Não consegui usar esta foto. Mostre o texto ao seu professor." }, { status: 422 });
  }
  return NextResponse.json({ titulo: lido.titulo ? apagarDadosPessoais(lido.titulo, aluno?.fullName ?? "") : null, texto });
}
