import { getOpenAI } from "@/lib/openai";
import { pseudonymize } from "./integrity";

export interface GradingInput {
  studentId: string;
  prompt: string;
  studentResponse: string;
  maxScore: number;
  language?: string;
}

export interface GradingResult {
  score: number;
  feedback: string;
  suggestedScore: number;
}

export interface AiFeedbackInput {
  studentId: string;
  subject: string;
  topic: string;
  studentText: string;
}

export async function gradeStudentResponse(input: GradingInput): Promise<GradingResult> {
  const openai = getOpenAI();
  const opaqueId = pseudonymize(input.studentId);

  const systemPrompt = `Você é um avaliador pedagógico. Avalie a resposta do aluno (ID opaco: ${opaqueId}) de forma justa e construtiva. Responda APENAS em JSON com os campos: score (número de 0 a ${input.maxScore}), feedback (string em português, máximo 200 caracteres), suggestedScore (número).`;

  const userMessage = `Enunciado: ${input.prompt}\n\nResposta do aluno: ${input.studentResponse}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<GradingResult>;

  return {
    score: Math.min(Math.max(Number(parsed.score) || 0, 0), input.maxScore),
    feedback: parsed.feedback ?? "",
    suggestedScore: Math.min(Math.max(Number(parsed.suggestedScore) || 0, 0), input.maxScore),
  };
}

export async function generateStudentFeedback(input: AiFeedbackInput): Promise<string> {
  const openai = getOpenAI();
  const opaqueId = pseudonymize(input.studentId);

  const systemPrompt = `Você é um professor de ${input.subject} do ensino fundamental/médio brasileiro. Dê feedback construtivo e encorajador sobre o texto do aluno (ID opaco: ${opaqueId}) sobre o tema "${input.topic}". Seja específico. Máximo 300 palavras. Responda apenas o feedback, sem prefácio.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: input.studentText },
    ],
    max_tokens: 400,
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
