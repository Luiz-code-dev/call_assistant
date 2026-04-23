import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../_auth";
import { getOpenAI } from "@/lib/openai";

const CEFR_EXPERT_PROMPT = `You are a certified CEFR (Common European Framework of Reference for Languages) English proficiency assessor specialized in evaluating spoken and written English samples from Brazilian professionals.

Your task is to analyze a collection of English responses from a language learner and determine their CEFR proficiency level.

## CEFR Level Descriptors

**A1 (Beginner):** Understands and uses familiar everyday expressions. Very limited vocabulary. Simple sentences with frequent errors that impede communication.

**A2 (Elementary):** Communicates in simple, routine tasks. Basic vocabulary related to immediate environment. Simple phrases but errors in complex structures are common.

**B1 (Intermediate):** Understands main points on familiar matters (work, school, leisure). Produces simple connected text. Uses common connectors (because, however, although). Some grammar errors but message is clear.

**B2 (Upper-Intermediate):** Understands complex texts on concrete and abstract topics. Spontaneous interaction with native speakers is possible. Clear, detailed text on a range of subjects. Good grammatical control with occasional non-systematic errors.

**C1 (Advanced):** Uses language flexibly and effectively for social, academic, and professional purposes. Produces well-structured, coherent text. Very few errors. Rich vocabulary with good collocational awareness.

**C2 (Proficient):** Understands virtually everything. Expresses spontaneously, fluently, and precisely. Distinguishes fine shades of meaning in complex situations.

## Evaluation Criteria

Analyze each response sample for:
1. **Vocabulary Range** — variety, precision, and appropriateness of word choice; use of collocations and idiomatic expressions
2. **Grammatical Accuracy** — correct use of tenses, articles, prepositions, conditionals, passive voice, sentence structures
3. **Coherence & Cohesion** — logical flow, use of discourse markers, topic development
4. **Task Achievement** — relevance, completeness, and appropriateness of response to the prompt
5. **Lexical Sophistication** — professional/academic vocabulary, nuanced expression

## Certificate Eligibility

A learner is eligible for a SpeakFlow Proficiency Certificate if:
- Their assessed level is B1 or above (B1, B2, C1, or C2)
- Their responses show consistent performance across multiple samples
- They demonstrate clear communicative competence in professional contexts

Set isEligible to true ONLY for B1 level and above with consistent performance.

## Output Format

Respond with ONLY valid JSON, no extra text, no markdown:

{
  "level": "B2",
  "levelLabel": "Upper-Intermediate",
  "confidence": "high",
  "reasoning": "The learner consistently demonstrates upper-intermediate competence through...",
  "strengths": ["Clear professional vocabulary", "Good use of complex sentence structures", "Effective use of discourse markers"],
  "improvements": ["Article usage (a/an/the) needs attention in academic contexts", "Occasional tense inconsistency in narratives"],
  "overallFeedback": "You are performing at a solid B2 Upper-Intermediate level. Your English is effective for professional communication in international environments. Focus on perfecting article usage and verb tense consistency to progress toward C1.",
  "isEligible": true
}`;

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.sub }, select: { plan: true } });
  const isPremium = user?.plan === "premium";

  const evaluated = await db.submissionEvaluation.findMany({
    where: { submission: { userId: session.sub, isSelected: true } },
    include: { submission: { select: { content: true, challenge: { select: { title: true, prompt: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (evaluated.length < 3)
    return NextResponse.json({ error: "Você precisa de pelo menos 3 avaliações concluídas para solicitar a avaliação de proficiência." }, { status: 422 });

  const fluencyAvg = evaluated.reduce((a, e) => a + e.fluencyScore, 0) / evaluated.length;
  const contentAvg = evaluated.reduce((a, e) => a + e.contentScore, 0) / evaluated.length;
  const clarityAvg = evaluated.reduce((a, e) => a + e.clarityScore, 0) / evaluated.length;
  const totalAvg   = evaluated.reduce((a, e) => a + e.totalScore, 0) / evaluated.length;

  const samplesText = evaluated.map((e, i) => `
--- Sample ${i + 1} ---
Challenge: ${e.submission.challenge.title}
Prompt: ${e.submission.challenge.prompt}
Response: ${e.submission.content}
AI Scores: Fluency ${e.fluencyScore}/10 | Content ${e.contentScore}/10 | Clarity ${e.clarityScore}/10 | Total ${e.totalScore}/10
Feedback: ${e.feedback}
`.trim()).join("\n\n");

  const userMessage = `Please assess the following ${evaluated.length} English response samples from a Brazilian professional learner and determine their CEFR proficiency level:\n\n${samplesText}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CEFR_EXPERT_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as {
      level: string;
      levelLabel: string;
      confidence: string;
      reasoning: string;
      strengths: string[];
      improvements: string[];
      overallFeedback: string;
      isEligible: boolean;
    };

    const assessment = await db.proficiencyAssessment.create({
      data: {
        userId: session.sub,
        level: result.level ?? "B1",
        levelLabel: result.levelLabel ?? "Intermediate",
        confidence: result.confidence ?? "medium",
        fluencyAvg,
        contentAvg,
        clarityAvg,
        totalAvg,
        reasoning: result.reasoning ?? "",
        strengths: JSON.stringify(result.strengths ?? []),
        improvements: JSON.stringify(result.improvements ?? []),
        overallFeedback: result.overallFeedback ?? "",
        submissionsUsed: evaluated.length,
        isEligible: isPremium && result.isEligible === true,
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (err) {
    console.error("[proficiency/assess]", err);
    return NextResponse.json({ error: "Erro ao processar avaliação. Tente novamente." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const latest = await db.proficiencyAssessment.findFirst({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return NextResponse.json(null);

  return NextResponse.json({
    ...latest,
    strengths: JSON.parse(latest.strengths as string),
    improvements: JSON.parse(latest.improvements as string),
  });
}
