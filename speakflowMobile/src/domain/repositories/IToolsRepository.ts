import type { ImproveResult, GenerateResult, InterviewResult } from "@domain/entities/Tool";
import type { Result } from "@shared/types";

export interface IToolsRepository {
  improveText(text: string): Promise<Result<ImproveResult>>;
  generateResponse(context: string): Promise<Result<GenerateResult>>;
  generateInterview(role: string, level: string): Promise<Result<InterviewResult>>;
}
