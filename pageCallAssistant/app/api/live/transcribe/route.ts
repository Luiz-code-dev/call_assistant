import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "@/app/api/tools/_auth";
import { checkToolAccess, isOrgMember } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

function isWhisperHallucination(text: string): boolean {
  if (text.length < 4) return true;
  if (/[◆♪♫♩♬✦◉]/.test(text)) return true;
  if (/(.)\1{3,}/.test(text)) return true;
  const stripped = text.replace(/\s/g, "");
  if (stripped.length > 15 && new Set(stripped).size / stripped.length < 0.05) return true;
  const hallucinations = ["thank you for watching", "thanks for watching", "subtitles by", "transcribed by", "www.", "http"];
  const lower = text.toLowerCase();
  if (hallucinations.some((h) => lower.includes(h))) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido. Envie multipart/form-data." }, { status: 400 });
  }

  const audio = formData.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "audio é obrigatório." }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Áudio muito grande (máx. 25 MB)." }, { status: 413 });
  if (audio.size < 500) return NextResponse.json({ error: "Áudio muito curto. Fale por mais tempo." }, { status: 422 });

  const orgMember = await isOrgMember(session.sub);
  if (!orgMember) {
    const access = await checkToolAccess(session.sub, "live");
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  try {
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: new File(
        [await audio.arrayBuffer()],
        audio.name || "live.m4a",
        { type: audio.type || "audio/m4a" }
      ),
      model: "whisper-1",
    });

    const transcript = transcription.text?.trim();
    if (!transcript) return NextResponse.json({ error: "Não foi possível transcrever o áudio." }, { status: 422 });
    if (isWhisperHallucination(transcript)) return NextResponse.json({ error: "Áudio não reconhecido. Fale mais próximo do microfone." }, { status: 422 });

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[api/live/transcribe]", err);
    return NextResponse.json({ error: "Erro ao transcrever." }, { status: 500 });
  }
}
