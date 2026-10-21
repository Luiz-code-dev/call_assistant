import type { UserPlan } from "@shared/types";

export interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  credits: number;
  avatarUrl: string | null;
  b2bAccess: boolean;
  crmAccess: boolean;
  superAdmin: boolean;
  hasSeenOnboarding: boolean;
}

export interface AuthTokens {
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}
