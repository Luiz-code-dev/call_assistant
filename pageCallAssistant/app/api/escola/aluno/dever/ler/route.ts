/**
 * POST /api/escola/aluno/dever/ler  (multipart: foto) -> { enunciado, materia }
 * Lê o enunciado do exercício na foto do dever. A foto só passa pela moderação e pela
 * leitura e não é guardada. O nome do aluno e dados pessoais são apagados do texto.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getOpenAI } from "@/lib/openai";
import { moderateText, ModerationError } from "@/lib/escola/ai-gateway";
import { dentroDoLimiteFoto } from "@/lib/escola/ajudante";
import { PROMPT_LEITURA, apagarDadosPessoais, lerResposta } from "@/lib/escola/dever";

export const runtime = "nodejs";
export const maxDuration = 45;

const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  if (!dentroDoLimiteFoto(ctx.studentId)) return NextResponse.json({ error: "Você já mandou muitas fotos nesta hora. Tente de novo mais tarde." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "A leitura de fotos não está disponível agora." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const foto = form?.get("foto") as File | null;
  if (!foto) return NextResponse.json({ error: "Não recebi a foto." }, { status: 400 });
  if (!TIPOS.includes(foto.type)) return NextResponse.json({ error: "Envie uma foto (JPG ou PNG)." }, { status: 415 });
  if (foto.size > MAX_BYTES) return NextResponse.json({ error: "A foto ficou muito grande. Recorte só o exercício." }, { status: 413 });

  const dataUrl = `data:${foto.type};base64,${Buffer.from(await foto.arrayBuffer()).toString("base64")}`;
  const openai = getOpenAI();

  // 1) Moderação da imagem
  try {
    const m = await openai.moderations.create({ model: "omni-moderation-latest", input: [{ type: "image_url", image_url: { url: dataUrl } }] });
    if (m.results[0]?.flagged) return NextResponse.json({ error: "Essa foto não parece um exercício da escola. Fotografe só o dever." }, { status: 422 });
  } catch (err) {
    console.error("[aluno/dever/ler] moderação:", (err as Error).message);
    return NextResponse.json({ error: "Não consegui ler agora. Tente de novo daqui a pouco." }, { status: 502 });
  }

  // 2) Leitura só do enunciado, sem dados pessoais
  let lido: { enunciado: string; materia: string | null; ano: number | null } | null = null;
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0, max_tokens: 1000, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_LEITURA },
        { role: "user", content: [{ type: "text", text: "Transcreva o enunciado deste exercício." }, { type: "image_url", image_url: { url: dataUrl, detail: "high" } }] },
      ],
    });
    lido = lerResposta(r.choices[0]?.message?.content ?? "");
  } catch (err) {
    console.error("[aluno/dever/ler] leitura:", (err as Error).message);
    return NextResponse.json({ error: "Não consegui ler agora. Tente de novo daqui a pouco." }, { status: 502 });
  }
  if (!lido) return NextResponse.json({ error: "Não consegui achar um exercício na foto. Chegue mais perto, com boa luz, e recorte só o exercício." }, { status: 422 });

  // 3) Apaga o nome do aluno e dados pessoais que tenham escapado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
  const aluno = await (prismaEdu as any).eduStudent.findUnique({ where: { id: ctx.studentId }, select: { fullName: true } }).catch(() => null);
  const enunciado = apagarDadosPessoais(lido.enunciado, aluno?.fullName ?? "");
  try { await moderateText(enunciado); } catch (e) {
    if (e instanceof ModerationError) return NextResponse.json({ error: "Essa foto não parece um exercício da escola. Fotografe só o dever." }, { status: 422 });
  }
  return NextResponse.json({ enunciado, materia: lido.materia, ano: lido.ano });
}
