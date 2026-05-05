import { NextRequest, NextResponse } from "next/server";
import { getNetworkSession } from "@/app/api/network/_auth";
import { getOpenAI } from "@/lib/openai";

type Action = "translate" | "grammar" | "native" | "cefr";

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { text, action, targetLang } = await req.json() as {
    text: string;
    action: Action;
    targetLang?: string;
  };

  if (!text?.trim() || text.length > 1000)
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });

  const openai = getOpenAI();

  const prompts: Record<Action, { system: string; user: string }> = {
    translate: {
      system: `You are a bilingual translator (English ↔ Portuguese). Detect the language of the input and translate it to ${targetLang === "en" ? "English" : "Portuguese"}. Return ONLY the translated text, nothing else.`,
      user: text,
    },
    grammar: {
      system: `You are an English grammar checker for Brazilian learners. Analyze the text and return a JSON object with:
- "hasErrors": boolean
- "corrected": corrected version of the text (string)
- "errors": array of { "original": string, "fix": string, "tip": string (in Portuguese) }
If there are no errors, return corrected = original text and errors = [].
Respond with ONLY valid JSON.`,
      user: text,
    },
    native: {
      system: `You are an English coach. Rewrite the following text as a native English speaker would naturally say it, maintaining the original meaning but improving naturalness, idioms, and flow. Return ONLY the rewritten text.`,
      user: text,
    },
    cefr: {
      system: `You are a CEFR English assessor. Analyze this text and return a JSON object with:
- "level": one of "A1","A2","B1","B2","C1","C2"
- "label": the level label in Portuguese (e.g., "Intermediário Superior")
- "tip": one short tip in Portuguese (max 20 words) to improve to the next level
Respond with ONLY valid JSON.`,
      user: text,
    },
  };

  if (!prompts[action]) return NextResponse.json({ error: "invalid_action" }, { status: 400 });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts[action].system },
        { role: "user", content: prompts[action].user },
      ],
      temperature: 0.3,
      max_tokens: 400,
      ...(action === "grammar" || action === "cefr"
        ? { response_format: { type: "json_object" } }
        : {}),
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    if (action === "translate" || action === "native") {
      return NextResponse.json({ result: raw.trim() });
    }
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    console.error("[messages/assist]", err);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
