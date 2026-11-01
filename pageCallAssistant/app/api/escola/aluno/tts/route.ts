/**
 * POST /api/escola/aluno/tts
 * Gera áudio TTS para o enunciado ou alternativas de uma atividade/diagnóstico.
 * Usa OpenAI TTS e cacheia em EduActivity.audioPromptUrl quando recebe activityId.
 * Proteção: requer sessão de aluno válida.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { text } = await req.json().catch(() => ({}));
  if (!text || typeof text !== "string" || text.trim().length < 1)
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });

  // Limita a 500 caracteres para evitar abusos
  const ttsText = text.slice(0, 500);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Sem chave: retorna 204, o cliente usa speechSynthesis como fallback
    return new NextResponse(null, { status: 204 });
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: "nova", input: ttsText, response_format: "mp3" }),
    });

    if (!resp.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const buf = await resp.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
