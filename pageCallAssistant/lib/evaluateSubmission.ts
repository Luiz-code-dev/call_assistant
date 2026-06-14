import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { consumeToolCredits } from "@/lib/planGuard";
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

export interface EvaluationResult {
  id: string;
  submissionId: string;
  fluencyScore: number;
  contentScore: number;
  clarityScore: number;
  totalScore: number;
  feedback: string;
  improvedResponse: string;
  tip: string;
}

export class EvaluationError extends Error {
  status: number;
  evaluation?: unknown;
  constructor(message: string, status: number, evaluation?: unknown) {
    super(message);
    this.name = "EvaluationError";
    this.status = status;
    this.evaluation = evaluation;
  }
}

/**
 * Avalia uma submissão com IA e persiste a avaliação.
 * @param charge se true, debita créditos do usuário (uso manual da ferramenta).
 *               Para auto-avaliação ao submeter um desafio, use false.
 */
export async function evaluateSubmission(
  submissionId: string,
  userId: string,
  opts: { charge?: boolean } = {}
): Promise<EvaluationResult> {
  const charge = opts.charge ?? true;

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { challenge: true, evaluation: true },
  });
  if (!submission) throw new EvaluationError("Submissão não encontrada.", 404);
  if (submission.userId !== userId) throw new EvaluationError("Sem permissão.", 403);
  if (submission.evaluation)
    throw new EvaluationError("Esta submissão já foi avaliada.", 409, submission.evaluation);

  let aiResult: Omit<EvaluationResult, "id" | "submissionId">;
  try {
    const openai = getOpenAI();

    let targetVocab: string[] = [];
    try {
      if (submission.challenge.targetVocab) targetVocab = JSON.parse(submission.challenge.targetVocab);
    } catch { targetVocab = []; }

    const parts = [`Challenge instruction: "${submission.challenge.prompt}"`];
    if (submission.challenge.scenario) parts.push(`Real-world scenario: "${submission.challenge.scenario}"`);
    if (targetVocab.length > 0) {
      parts.push(`Target vocabulary the candidate was asked to use: ${targetVocab.join(", ")}. In the "feedback", explicitly state which of these target words were used correctly and which were missing.`);
    }
    parts.push(`Candidate's response:\n"${submission.content}"`);
    const userMessage = parts.join("\n\n");

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
    const totalScore = Math.round(fluencyScore * 0.3 + contentScore * 0.4 + clarityScore * 0.3);
    aiResult = {
      fluencyScore,
      contentScore,
      clarityScore,
      totalScore,
      feedback: parsed.feedback ?? "",
      improvedResponse: parsed.improvedResponse ?? "",
      tip: parsed.tip ?? "",
    };
  } catch (aiErr) {
    console.error("[evaluateSubmission] OpenAI error", aiErr);
    throw new EvaluationError("Falha ao contatar a IA. Tente novamente em instantes.", 502);
  }

  try {
    const evaluation = await db.submissionEvaluation.create({
      data: { submissionId: submission.id, ...aiResult },
    });
    if (charge) await consumeToolCredits(userId, "network");
    await checkAndAwardBadges(userId, "evaluation", { evalScore: aiResult.totalScore }).catch(() => []);
    return evaluation;
  } catch (dbErr) {
    if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === "P2002") {
      const existing = await db.submissionEvaluation.findUnique({ where: { submissionId: submission.id } });
      throw new EvaluationError("Esta submissão já foi avaliada.", 409, existing);
    }
    console.error("[evaluateSubmission] DB error", dbErr);
    throw new EvaluationError("Erro ao salvar avaliação. Tente novamente.", 500);
  }
}
