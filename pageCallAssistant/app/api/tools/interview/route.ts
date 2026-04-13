import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "../_auth";
import { checkToolAccess, consumeToolCredits, CREDITS_PER_USE } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";

const SYSTEM_PROMPT = `You are a senior technical interviewer at a top tech company conducting a mock English job interview.
Your role: ask realistic interview questions, evaluate answers, and provide coaching.

Rules:
- Always return ONLY a valid JSON object
- Be professional but encouraging
- Focus on software development / IT roles
- Vary question types: behavioral, technical, situational

JSON fields:
- "question": your next interview question in English (or empty string if it's the very first message — start with a greeting and first question combined)
- "feedback": constructive feedback on the user's answer in Portuguese (empty string on first message)
- "suggestion": a better/model answer in English (empty string on first message)
- "score": integer 1-10 for the answer quality (0 on first message)
- "tip": one quick coaching tip in Portuguese (empty string on first message)
- "isFinished": boolean, true only after 8 user answers — then also include "summary" field
- "summary": overall assessment in Portuguese (only when isFinished=true)`;

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const messages: { role: "user" | "assistant"; content: string }[] = body.messages ?? [];
  const userMessage: string = (body.message ?? "").trim();
  const isStart: boolean = body.isStart === true;

  if (!isStart && !userMessage) {
    return NextResponse.json({ error: "Resposta obrigatória." }, { status: 400 });
  }
  if (userMessage.length > 3000) {
    return NextResponse.json({ error: "Resposta muito longa (máx. 3000 caracteres)." }, { status: 400 });
  }
  if (messages.length > 30) {
    return NextResponse.json({ error: "Limite de mensagens da sessão atingido." }, { status: 400 });
  }

  const access = await checkToolAccess(session.sub, "interview");
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason, userPlan: access.userPlan },
      { status: 403 }
    );
  }

  try {
    const openai = getOpenAI();
    const conversation = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages,
      ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversation,
      response_format: { type: "json_object" },
      max_tokens: 700,
      temperature: 0.8,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const result = JSON.parse(raw);

    if (!isStart && userMessage) {
      await consumeToolCredits(session.sub, "interview");
    }

    return NextResponse.json({
      question:   result.question   ?? "",
      feedback:   result.feedback   ?? "",
      suggestion: result.suggestion ?? "",
      score:      result.score      ?? 0,
      tip:        result.tip        ?? "",
      isFinished: result.isFinished ?? false,
      summary:    result.summary    ?? "",
      creditsUsed: (!isStart && userMessage) ? CREDITS_PER_USE : 0,
    });
  } catch (err) {
    console.error("[api/tools/interview]", err);
    return NextResponse.json({ error: "Erro ao processar com IA. Tente novamente." }, { status: 500 });
  }
}
