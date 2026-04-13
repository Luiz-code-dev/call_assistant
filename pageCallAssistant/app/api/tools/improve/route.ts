import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "../_auth";
import { checkToolAccess, consumeToolCredits, CREDITS_PER_USE } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text: string = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Texto obrigatório." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Texto muito longo (máx. 2000 caracteres)." }, { status: 400 });

  const access = await checkToolAccess(session.sub, "improve");
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason, userPlan: access.userPlan, dailyUsed: access.dailyUsed, dailyLimit: access.dailyLimit },
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
          content: `You are a professional English language coach helping Brazilian professionals improve their English.
Analyze the user's English text and return ONLY a valid JSON object with these fields:
- "improved": the improved, natural, professional version of the text
- "score": integer 1-10 rating the original text quality
- "explanation": brief explanation in Portuguese of what was changed and why
- "tips": array of exactly 2 concise improvement tips in Portuguese`,
        },
        { role: "user", content: `Improve this English text:\n\n"${text}"` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
      temperature: 0.6,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const result = JSON.parse(raw);

    await consumeToolCredits(session.sub, "improve");

    return NextResponse.json({
      improved:    result.improved    ?? "",
      score:       result.score       ?? 0,
      explanation: result.explanation ?? "",
      tips:        result.tips        ?? [],
      creditsUsed: CREDITS_PER_USE,
      dailyUsed:   (access.dailyUsed ?? 0) + 1,
      dailyLimit:  access.dailyLimit,
    });
  } catch (err) {
    console.error("[api/tools/improve]", err);
    return NextResponse.json({ error: "Erro ao processar com IA. Tente novamente." }, { status: 500 });
  }
}
