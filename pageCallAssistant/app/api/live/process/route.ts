import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { getToolSession } from "@/app/api/tools/_auth";
import { checkToolAccess, consumeToolCredits, isOrgMember, CREDITS_PER_USE } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

async function suggestViaOpenAI(
  openai: OpenAI,
  transcript: string,
  meetingContext: string,
  isEnglish: boolean,
): Promise<{ translation: string; suggestions: string[]; suggestion_translations: string[] }> {
  const translateFrom = isEnglish ? "inglês" : "português";
  const translateTo   = isEnglish ? "português" : "inglês";
  const systemPrompt = `Você é um copiloto de comunicação em tempo real.
Contexto: ${meetingContext || "Conversa geral"}.
Sua tarefa:
1. Traduza do ${translateFrom} para o ${translateTo}.
2. Gere exatamente 3 sugestões de resposta em ${isEnglish ? "inglês" : "português"}: Curta, Profissional, Detalhada.
3. Traduza cada sugestão para ${isEnglish ? "português" : "inglês"}.
Responda EXCLUSIVAMENTE em JSON:
{"translation":"...","suggestions":["...","...","..."],"suggestion_translations":["...","...","..."]}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 600,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
  });
  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
    translation?: string; suggestions?: string[]; suggestion_translations?: string[];
  };
  return {
    translation: parsed.translation ?? "",
    suggestions: parsed.suggestions ?? [],
    suggestion_translations: parsed.suggestion_translations ?? [],
  };
}

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
  const custom_context = (formData.get("custom_context") as string | null) ?? "";

  if (!audio || !session_id) {
    return NextResponse.json({ error: "audio e session_id são obrigatórios." }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Áudio muito grande (máx. 25 MB)." }, { status: 413 });
  }
  if (audio.size < 500) {
    return NextResponse.json({ error: "Áudio muito curto. Fale por mais tempo." }, { status: 422 });
  }

  const orgMember = await isOrgMember(session.sub);

  if (!orgMember) {
    const access = await checkToolAccess(session.sub, "live");
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason, userPlan: access.userPlan }, { status: 403 });
    }
  }

  try {
    const openai = getOpenAI();

    // 1 — Transcribe audio via Whisper
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

    const baseContext = [focus, level].filter(Boolean).join(" · ");
    const meeting_context = custom_context.trim()
      ? `${baseContext}${baseContext ? " · " : ""}Detalhes: ${custom_context.trim()}`
      : baseContext;
    const isEnglish = source_lang.startsWith("en");

    // 2 — Get suggestions (Python service optional, OpenAI as primary/fallback)
    let suggestionData: { translation: string; suggestions: string[]; suggestion_translations: string[] };

    const copilotUrl = process.env.COPILOT_SERVICE_URL;
    if (copilotUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);
        const res = await fetch(`${copilotUrl}/copilot/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: `live_${session.sub}_${session_id}`,
            transcript,
            meeting_context,
            source_lang,
            target_lang: "pt-BR",
          }),
        });
        clearTimeout(timeout);
        if (res.ok) {
          suggestionData = await res.json() as typeof suggestionData;
        } else {
          throw new Error(`copilot ${res.status}`);
        }
      } catch {
        suggestionData = await suggestViaOpenAI(openai, transcript, meeting_context, isEnglish);
      }
    } else {
      suggestionData = await suggestViaOpenAI(openai, transcript, meeting_context, isEnglish);
    }

    if (!orgMember) await consumeToolCredits(session.sub, "live");

    return NextResponse.json({
      transcript,
      translation: suggestionData.translation ?? "",
      suggestions: suggestionData.suggestions ?? [],
      suggestion_translations: suggestionData.suggestion_translations ?? [],
      creditsUsed: orgMember ? 0 : CREDITS_PER_USE,
    });
  } catch (err) {
    console.error("[api/live/process]", err);
    return NextResponse.json({ error: "Erro ao processar. Tente novamente." }, { status: 500 });
  }
}
