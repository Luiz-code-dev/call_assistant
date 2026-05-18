import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "../_auth";
import { checkToolAccess, consumeToolCredits, CREDITS_PER_USE } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const context: string = (body.context ?? "").trim();
  if (!context) return NextResponse.json({ error: "Contexto obrigatório." }, { status: 400 });
  if (context.length > 1000) return NextResponse.json({ error: "Contexto muito longo (máx. 1000 caracteres)." }, { status: 400 });

  const access = await checkToolAccess(session.sub, "generate");
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason, userPlan: access.userPlan },
      { status: 403 }
    );
  }

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional English communication coach for Brazilian IT professionals.
Generate ready-to-use English responses and return ONLY a valid JSON object with:
- "short": a concise response (1-2 sentences, informal but professional)
- "professional": a polished professional response (2-3 sentences)
- "detailed": a comprehensive response (3-4 sentences with context)
- "translation": Portuguese translation of the "professional" version
- "usage_tip": one practical tip in Portuguese on when/how to use these responses`,
        },
        { role: "user", content: `Generate English responses for this situation: "${context}"` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const result = JSON.parse(raw);

    await consumeToolCredits(session.sub, "generate");

    return NextResponse.json({
      short:       result.short       ?? "",
      professional: result.professional ?? "",
      detailed:    result.detailed    ?? "",
      translation: result.translation ?? "",
      usage_tip:   result.usage_tip   ?? "",
      creditsUsed: CREDITS_PER_USE,
    });
  } catch (err) {
    console.error("[api/tools/generate]", err);
    return NextResponse.json({ error: "Erro ao processar com IA. Tente novamente." }, { status: 500 });
  }
}
