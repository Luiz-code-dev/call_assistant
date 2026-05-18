import { ApiClient } from "@infrastructure/http/ApiClient";
import type { ImproveResult, GenerateResult, InterviewResult } from "@domain/entities/Tool";
import type { Result } from "@shared/types";

interface RawImproveResponse {
  improved: string;
  score: number;
  explanation: string;
  tips: string[];
  creditsUsed: number;
}

interface RawGenerateResponse {
  short: string;
  professional: string;
  detailed: string;
  translation: string;
  usage_tip: string;
  creditsUsed: number;
}

interface RawInterviewResponse {
  questions: { question: string; context: string }[];
  creditsUsed: number;
}

export const ToolsApi = {
  async improveText(text: string): Promise<Result<ImproveResult>> {
    const result = await ApiClient.post<RawImproveResponse>("/api/tools/improve", { text });
    if (!result.ok) return result;
    return {
      ok: true,
      data: {
        improved: result.data.improved,
        score: result.data.score,
        explanation: result.data.explanation,
        tips: result.data.tips,
        creditsUsed: result.data.creditsUsed,
      },
    };
  },

  async generateResponse(context: string): Promise<Result<GenerateResult>> {
    const result = await ApiClient.post<RawGenerateResponse>("/api/tools/generate", { context });
    if (!result.ok) return result;
    return {
      ok: true,
      data: {
        short: result.data.short,
        professional: result.data.professional,
        detailed: result.data.detailed,
        translation: result.data.translation,
        usageTip: result.data.usage_tip,
        creditsUsed: result.data.creditsUsed,
      },
    };
  },

  async generateInterview(role: string, level: string): Promise<Result<InterviewResult>> {
    const result = await ApiClient.post<RawInterviewResponse>("/api/tools/interview", { role, level });
    if (!result.ok) return result;
    return {
      ok: true,
      data: {
        questions: result.data.questions,
        creditsUsed: result.data.creditsUsed,
      },
    };
  },
};
