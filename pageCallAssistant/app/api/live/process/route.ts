import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "@/app/api/tools/_auth";
import { checkToolAccess, consumeToolCredits, CREDITS_PER_USE } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

function isWhisperHallucination(text: string): boolean {
  if (text.length < 4) return true;
  if (/[◆♪♫♩♬✦◉]/.test(text)) return true;
  if (/(.)\1{3,}/.test(text)) return true;
  const stripped = text.replace(/\s/g, "");
  if (stripped.length > 15 && new Set(stripped).size / stripped.length < 0.05) return true;
  const hallucinations = [
    "thank you for watching", "thanks for watching",
    "subtitles by", "transcribed by", "www.", "http",
  ];
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
  const session_id = formData.get("session_id") as string | null;
  const focus = (formData.get("focus") as string | null) ?? "";
  const level = (formData.get("level") as string | null) ?? "";
  const source_lang = (formData.get("source_lang") as string | null) || "en-US";

  if (!audio || !session_id) {
    return NextResponse.json({ error: "audio e session_id são obrigatórios." }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Áudio muito grande (máx. 25 MB)." }, { status: 413 });
  }
  if (audio.size < 500) {
    return NextResponse.json({ error: "Áudio muito curto. Fale por mais tempo." }, { status: 422 });
  }

  const access = await checkToolAccess(session.sub, "live");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, userPlan: access.userPlan }, { status: 403 });
  }

  const copilotUrl = process.env.COPILOT_SERVICE_URL;
  if (!copilotUrl) {
    return NextResponse.json({ error: "Serviço de IA indisponível." }, { status: 503 });
  }

  try {
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: new File(
        [await audio.arrayBuffer()],
        audio.name || "live.webm",
        { type: audio.type || "audio/webm" }
      ),
      model: "whisper-1",
    });

    const transcript = transcription.text?.trim();
    if (!transcript) {
      return NextResponse.json({ error: "Não foi possível transcrever o áudio." }, { status: 422 });
    }
    if (isWhisperHallucination(transcript)) {
      return NextResponse.json({ error: "Áudio não reconhecido. Fale mais próximo do microfone." }, { status: 422 });
    }

    const meeting_context = [focus, level].filter(Boolean).join(" · ");

    const res = await fetch(`${copilotUrl}/copilot/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: `live_${session.sub}_${session_id}`,
        transcript,
        meeting_context,
        source_lang,
        target_lang: "pt-BR",
      }),
    });

    if (!res.ok) {
      throw new Error(`Copilot service error: ${res.status}`);
    }

    const data = await res.json() as {
      translation?: string;
      suggestions?: string[];
      suggestion_translations?: string[];
    };

    await consumeToolCredits(session.sub, "live");

    return NextResponse.json({
      transcript,
      translation: data.translation ?? "",
      suggestions: data.suggestions ?? [],
      suggestion_translations: data.suggestion_translations ?? [],
      creditsUsed: CREDITS_PER_USE,
    });
  } catch (err) {
    console.error("[api/live/process]", err);
    return NextResponse.json({ error: "Erro ao processar. Tente novamente." }, { status: 500 });
  }
}
