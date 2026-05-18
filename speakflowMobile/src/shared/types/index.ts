export type UserPlan = "free" | "basic" | "premium";

export type ToolName =
  | "improve"
  | "generate"
  | "interview"
  | "live"
  | "meeting"
  | "practice"
  | "network";

export interface ApiError {
  message: string;
  statusCode: number;
}

export type Result<T, E = ApiError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
