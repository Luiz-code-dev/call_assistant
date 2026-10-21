import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "token_invalid" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, focus = "Business English", level = "Todos", count = 5 } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório." }, { status: 400 });

  const safeCount = Math.min(Math.max(Number(count) || 5, 3), 15);

  const prompt = `You are an English quiz creator for a professional English learning platform called SpeakFlow.
Create exactly ${safeCount} multiple-choice questions in English based on this challenge topic:

Topic: "${title}"
Circle focus: ${focus}
Level: ${level}

Rules:
- Questions must be in English and relevant to the topic
- Each question must have exactly 4 options (A, B, C, D)
- Only one option is correct
- Make questions progressively harder
- Focus on vocabulary, grammar, or situational usage relevant to the topic
- Avoid repeating patterns
- Options should be plausible and similar in length

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "questions": [
    {
      "question": "...",
      "options": ["option A text", "option B text", "option C text", "option D text"],
      "correctIndex": 0
    }
  ]
}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return NextResponse.json({ error: "IA não gerou questões válidas. Tente novamente." }, { status: 500 });
    }

    const questions = parsed.questions.slice(0, safeCount).map((q: {
      question: string;
      options: string[];
      correctIndex: number;
    }) => ({
      question: String(q.question ?? "").trim(),
      options: [
        String(q.options?.[0] ?? "").trim(),
        String(q.options?.[1] ?? "").trim(),
        String(q.options?.[2] ?? "").trim(),
        String(q.options?.[3] ?? "").trim(),
      ] as [string, string, string, string],
      correctIndex: Number(q.correctIndex ?? 0),
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("generate-quiz error:", err);
    return NextResponse.json({ error: "Erro ao gerar quiz com IA." }, { status: 500 });
  }
}
