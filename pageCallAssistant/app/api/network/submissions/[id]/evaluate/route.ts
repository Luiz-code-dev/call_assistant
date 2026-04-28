import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";
import { checkToolAccess, consumeToolCredits } from "@/lib/planGuard";
import { getOpenAI } from "@/lib/openai";
import { checkAndAwardBadges } from "@/lib/badges";

const EVAL_SYSTEM_PROMPT = `You are a professional English communication evaluator for a career development platform.
Evaluate the submitted response based on 3 criteria, each scored 0-10:
- fluency: natural use of language, grammar, flow
- content: relevance, depth, and quality of the answer
- clarity: structure, conciseness, and ease of understanding

Return ONLY a valid JSON object with these exact fields:
- "fluencyScore": integer 0-10
- "contentScore": integer 0-10
- "clarityScore": integer 0-10
- "totalScore": integer (weighted average: fluency 30%, content 40%, clarity 30%, rounded)
- "feedback": 2-3 sentences of constructive feedback in Portuguese
- "improvedResponse": a better version of the answer in English (max 200 words)
- "tip": one specific coaching tip in Portuguese (max 30 words)`;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const access = await checkToolAccess(session.sub, "network");
  if (!access.allowed) return NextResponse.json({ error: access.reason, userPlan: access.userPlan }, { status: 403 });

  const submission = await db.submission.findUnique({
    where: { id: params.id },
    include: { challenge: true, evaluation: true },
  });
  if (!submission) return NextResponse.json({ error: "Submissão não encontrada." }, { status: 404 });
  if (submission.userId !== session.sub)
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  if (submission.evaluation)
    return NextResponse.json({ error: "Esta submissão já foi avaliada.", evaluation: submission.evaluation }, { status: 409 });

  let aiResult: { fluencyScore: number; contentScore: number; clarityScore: number; totalScore: number; feedback: string; improvedResponse: string; tip: string } | null = null;

  try {
    const openai = getOpenAI();
    const userMessage = `Challenge context: "${submission.challenge.prompt}"\n\nCandidate's response:\n"${submission.content}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EVAL_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    const fluencyScore = Math.min(10, Math.max(0, Number(parsed.fluencyScore) || 0));
    const contentScore = Math.min(10, Math.max(0, Number(parsed.contentScore) || 0));
    const clarityScore = Math.min(10, Math.max(0, Number(parsed.clarityScore) || 0));
    const totalScore   = Math.round(fluencyScore * 0.3 + contentScore * 0.4 + clarityScore * 0.3);
    aiResult = {
      fluencyScore, contentScore, clarityScore, totalScore,
      feedback:         parsed.feedback         ?? "",
      improvedResponse: parsed.improvedResponse ?? "",
      tip:              parsed.tip              ?? "",
    };
  } catch (aiErr) {
    console.error("[evaluate] OpenAI error", aiErr);
    return NextResponse.json({ error: "Falha ao contatar a IA. Tente novamente em instantes." }, { status: 502 });
  }

  try {
    const evaluation = await db.submissionEvaluation.create({
      data: { submissionId: submission.id, ...aiResult },
    });
    await consumeToolCredits(session.sub, "network");
    const newBadges = await checkAndAwardBadges(session.sub, "evaluation", {
      evalScore: aiResult.totalScore,
    }).catch(() => []);
    return NextResponse.json({ ...evaluation, newBadges }, { status: 201 });
  } catch (dbErr) {
    if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === "P2002") {
      const existing = await db.submissionEvaluation.findUnique({ where: { submissionId: submission.id } });
      return NextResponse.json({ error: "Esta submissão já foi avaliada.", evaluation: existing }, { status: 409 });
    }
    console.error("[evaluate] DB error", dbErr);
    return NextResponse.json({ error: "Erro ao salvar avaliação. Tente novamente." }, { status: 500 });
  }
}
