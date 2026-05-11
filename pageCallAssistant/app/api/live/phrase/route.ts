import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { getToolSession } from "@/app/api/tools/_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { text } = await req.json().catch(() => ({}));
  if (!text || typeof text !== "string" || text.length > 300)
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You are an instant translator for English beginners. The user will type what they want to say in Portuguese. 
Respond ONLY as JSON: {"english": "natural short English phrase"}
Rules: be natural, concise (max 20 words), use everyday speech, do not explain.`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { english?: string };

    return NextResponse.json({ english: parsed.english ?? "" });
  } catch (err) {
    console.error("[api/live/phrase]", err);
    return NextResponse.json({ error: "Erro ao traduzir. Tente novamente." }, { status: 500 });
  }
}
