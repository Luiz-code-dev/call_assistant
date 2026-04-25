import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { getToolSession } from "@/app/api/tools/_auth";
import { checkToolAccess, consumeToolCredits, CREDITS_PER_USE } from "@/lib/planGuard";

export const runtime = "nodejs";

async function suggestViaOpenAI(
  transcript: string,
  meetingContext: string,
  sourceLang: string,
): Promise<{ translation: string; suggestions: string[]; suggestion_translations: string[] }> {
  const isEnglish = sourceLang.startsWith("en");
  const translateFrom = isEnglish ? "inglês" : "português";
  const translateTo   = isEnglish ? "português" : "inglês";

  const systemPrompt = `Você é um copiloto de comunicação em tempo real.
Contexto da conversa: ${meetingContext || "Conversa geral"}.
Idioma captado: ${sourceLang}.

Sua tarefa:
1. Traduza o trecho do ${translateFrom} para ${translateTo}.
2. Gere exatamente 3 sugestões de resposta em ${isEnglish ? "inglês" : "português"}: Curta, Profissional, Detalhada.
3. Traduza cada sugestão para ${isEnglish ? "português" : "inglês"}.

Responda EXCLUSIVAMENTE em JSON válido neste formato:
{
  "translation": "...",
  "suggestions": ["...", "...", "..."],
  "suggestion_translations": ["...", "...", "..."]
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 600,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    translation?: string;
    suggestions?: string[];
    suggestion_translations?: string[];
  };

  return {
    translation: parsed.translation ?? "",
    suggestions: parsed.suggestions ?? [],
    suggestion_translations: parsed.suggestion_translations ?? [],
  };
}

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const { session_id, transcript, focus, level, source_lang } = body as {
    session_id?: string;
    transcript?: string;
    focus?: string;
    level?: string;
    source_lang?: string;
  };

  if (!session_id || !transcript?.trim()) {
    return NextResponse.json({ error: "session_id e transcript são obrigatórios." }, { status: 400 });
  }

  const access = await checkToolAccess(session.sub, "live");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, userPlan: access.userPlan }, { status: 403 });
  }

  const meetingContext = [focus, level].filter(Boolean).join(" · ");
  const lang = source_lang || "en-US";

  try {
    let data: { translation: string; suggestions: string[]; suggestion_translations: string[] };

    const copilotUrl = process.env.COPILOT_SERVICE_URL;
    if (copilotUrl) {
      // Optional: proxy to Python AgentScope service (session memory)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const res = await fetch(`${copilotUrl}/copilot/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: `live_${session.sub}_${session_id}`,
            transcript: transcript.trim(),
            meeting_context: meetingContext,
            source_lang: lang,
            target_lang: "pt-BR",
          }),
        });
        clearTimeout(timeout);
        if (res.ok) {
          data = await res.json() as typeof data;
        } else {
          throw new Error(`copilot ${res.status}`);
        }
      } catch {
        // Python service unavailable — fall through to OpenAI
        data = await suggestViaOpenAI(transcript.trim(), meetingContext, lang);
      }
    } else {
      // No Python service configured — use OpenAI directly
      data = await suggestViaOpenAI(transcript.trim(), meetingContext, lang);
    }

    await consumeToolCredits(session.sub, "live");

    return NextResponse.json({
      transcript: transcript.trim(),
      translation: data.translation ?? "",
      suggestions: data.suggestions ?? [],
      suggestion_translations: data.suggestion_translations ?? [],
      creditsUsed: CREDITS_PER_USE,
    });
  } catch (err) {
    console.error("[api/live/suggest]", err);
    return NextResponse.json({ error: "Erro ao processar com IA. Tente novamente." }, { status: 500 });
  }
}
