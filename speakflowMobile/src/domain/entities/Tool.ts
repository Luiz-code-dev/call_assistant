import type { ToolName } from "@shared/types";

export interface ImproveResult {
  improved: string;
  score: number;
  explanation: string;
  tips: string[];
  creditsUsed: number;
}

export interface GenerateResult {
  short: string;
  professional: string;
  detailed: string;
  translation: string;
  usageTip: string;
  creditsUsed: number;
}

export interface InterviewQuestion {
  question: string;
  context: string;
}

export interface InterviewResult {
  questions: InterviewQuestion[];
  creditsUsed: number;
}

export interface ToolUsage {
  tool: ToolName;
  usedAt: Date;
}
