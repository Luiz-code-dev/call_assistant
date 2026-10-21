import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { getOrgSessionById } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string; challengeId: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { content } = await req.json().catch(() => ({}));
  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo é obrigatório." }, { status: 400 });

  const challenge = await (db as any).corporateChallenge.findFirst({
    where: { id: params.challengeId, orgId: params.orgId },
  });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });

  const now = new Date();
  if (now < new Date(challenge.startsAt) || now > new Date(challenge.endsAt)) {
    return NextResponse.json({ error: "Desafio não está ativo no momento." }, { status: 400 });
  }

  let clarityScore = 0, confidenceScore = 0, fluencyScore = 0, contextScore = 0, totalScore = 0;
  let feedback = "";

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are an expert corporate communication coach evaluating an employee's English response.

Challenge: "${challenge.title}"
Description: "${challenge.description}"
Category: ${challenge.category}
${challenge.scenario ? `Scenario: ${challenge.scenario}` : ""}

Employee's response:
"${content}"

Evaluate the response and return a JSON object with these scores (0-100 each):
- clarityScore: how clear and understandable the message is
- confidenceScore: how confident and assertive the tone is
- fluencyScore: how natural and fluent the English is
- contextScore: how contextually appropriate and professional the response is
- totalScore: weighted average
- feedback: 2-3 sentences of actionable, specific feedback in Portuguese

Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content ?? "{}");
    clarityScore = Math.min(100, Math.max(0, result.clarityScore ?? 0));
    confidenceScore = Math.min(100, Math.max(0, result.confidenceScore ?? 0));
    fluencyScore = Math.min(100, Math.max(0, result.fluencyScore ?? 0));
    contextScore = Math.min(100, Math.max(0, result.contextScore ?? 0));
    totalScore = Math.min(100, Math.max(0, result.totalScore ?? Math.round((clarityScore + confidenceScore + fluencyScore + contextScore) / 4)));
    feedback = result.feedback ?? "";
  } catch (err) {
    console.error("[corp-challenge-submit] AI eval failed:", err);
    totalScore = 50;
    feedback = "Resposta recebida. Avaliação automática temporariamente indisponível.";
  }

  const submission = await (db as any).corpChallengeSubmission.create({
    data: {
      challengeId: params.challengeId,
      userId: org.userId,
      orgId: params.orgId,
      content,
      clarityScore,
      confidenceScore,
      fluencyScore,
      contextScore,
      totalScore,
      feedback,
    },
  });

  await (db as any).orgMember.update({
    where: { orgId_userId: { orgId: params.orgId, userId: org.userId } },
    data: { commScore: { increment: Math.round(totalScore / 10) } },
  });

  return NextResponse.json(submission, { status: 201 });
}
