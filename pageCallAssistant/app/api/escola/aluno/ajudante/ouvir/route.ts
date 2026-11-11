/**
 * POST /api/escola/aluno/ajudante/ouvir  (multipart: audio) -> { texto }
 * O aluno fala a dúvida para o Flow: transcreve o áudio (português) e devolve o texto
 * para o campo da conversa. O áudio não é guardado.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";
import { dentroDoLimiteVoz } from "@/lib/escola/ajudante";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 3 * 1024 * 1024; // ~1 minuto de fala

function parecido(t: string): boolean {
  if (t.length < 2) return false;
  if (/[◆♪♫♩♬✦◉]/.test(t)) return false;
  return !["thank you for watching", "thanks for watching", "legendas pela comunidade", "subtitles by", "obrigado por assistir", "www.", "http"].some((h) => t.toLowerCase().includes(h));
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!dentroDoLimiteVoz(ctx.studentId)) return NextResponse.json({ error: "Você já falou bastante comigo nesta hora. Agora escreva a sua dúvida." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "A voz não está disponível agora. Escreva a sua dúvida." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "Não recebi o áudio." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "Fale um pouco mais curto, até uns 30 segundos." }, { status: 413 });
  if (audio.size < 800) return NextResponse.json({ error: "Não deu para ouvir. Segure o botão e fale mais perto." }, { status: 422 });

  try {
    const r = await getOpenAI().audio.transcriptions.create({
      file: new File([await audio.arrayBuffer()], audio.name || "fala.webm", { type: audio.type || "audio/webm" }),
      model: "whisper-1", language: "pt",
    });
    const texto = r.text?.trim() ?? "";
    if (!parecido(texto)) return NextResponse.json({ error: "Não entendi direito. Tente falar de novo, mais devagar." }, { status: 422 });
    return NextResponse.json({ texto: texto.slice(0, 500) });
  } catch (err) {
    console.error("[aluno/ajudante/ouvir]", (err as Error).message);
    return NextResponse.json({ error: "Não consegui ouvir agora. Escreva a sua dúvida." }, { status: 500 });
  }
}
