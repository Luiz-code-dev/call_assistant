import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "@/app/api/tools/_auth";
import { checkToolAccess, consumeToolCredits, CREDITS_PER_USE } from "@/lib/planGuard";

export const runtime = "nodejs";

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

  const copilotUrl = process.env.COPILOT_SERVICE_URL;
  if (!copilotUrl) {
    return NextResponse.json({ error: "Serviço de IA indisponível." }, { status: 503 });
  }

  const meeting_context = [focus, level].filter(Boolean).join(" · ");

  try {
    const res = await fetch(`${copilotUrl}/copilot/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: `live_${session.sub}_${session_id}`,
        transcript: transcript.trim(),
        meeting_context,
        source_lang: source_lang || "en-US",
        target_lang: "pt-BR",
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[api/live/suggest] copilot error:", res.status, errText);
      throw new Error(`Copilot service error: ${res.status}`);
    }

    const data = await res.json() as {
      translation?: string;
      suggestions?: string[];
      suggestion_translations?: string[];
    };

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
