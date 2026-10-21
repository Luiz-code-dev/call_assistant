import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

function isHallucination(text: string): boolean {
  if (text.length < 4) return true;
  if (/[◆♪♫♩♬✦◉]/.test(text)) return true;
  const hallucinations = ["thank you for watching", "thanks for watching", "subtitles by", "www.", "http"];
  return hallucinations.some((h) => text.toLowerCase().includes(h));
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const audio = formData.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "audio obrigatório" }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Áudio muito grande (máx 25 MB)" }, { status: 413 });
  if (audio.size < 500) return NextResponse.json({ error: "Áudio muito curto" }, { status: 422 });

  try {
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: new File([await audio.arrayBuffer()], audio.name || "audio.m4a", { type: audio.type || "audio/m4a" }),
      model: "whisper-1",
      language: (formData.get("language") as string | null) ?? "pt",
    });

    const transcript = transcription.text?.trim();
    if (!transcript) return NextResponse.json({ error: "Não foi possível transcrever" }, { status: 422 });
    if (isHallucination(transcript)) return NextResponse.json({ error: "Áudio não reconhecido. Fale mais perto do microfone." }, { status: 422 });

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[escola/aluno/transcrever]", err);
    return NextResponse.json({ error: "Erro ao transcrever" }, { status: 500 });
  }
}
