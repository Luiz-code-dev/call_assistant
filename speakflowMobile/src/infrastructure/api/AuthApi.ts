import { ApiClient } from "@infrastructure/http/ApiClient";
import type { User } from "@domain/entities/User";
import type { Result } from "@shared/types";

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    plan: string;
  };
  token: string;
}

interface MeResponse {
  id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  avatarUrl: string | null;
  b2bAccess: boolean;
  crmAccess: boolean;
  superAdmin: boolean;
}

export const AuthApi = {
  async login(email: string, password: string): Promise<Result<LoginResponse>> {
    return ApiClient.post<LoginResponse>("/api/auth/login", { email, password }, { skipAuth: true });
  },

  async register(name: string, email: string, password: string): Promise<Result<void>> {
    return ApiClient.post<void>("/api/auth/register", { name, email, password, acceptedTerms: true }, { skipAuth: true });
  },

  async getMe(): Promise<Result<User>> {
    const result = await ApiClient.get<MeResponse>("/api/auth/me");
    if (!result.ok) return result;

    return {
      ok: true,
      data: {
        id: result.data.id,
        name: result.data.name,
        email: result.data.email,
        plan: result.data.plan as User["plan"],
        credits: result.data.credits,
        avatarUrl: result.data.avatarUrl,
        b2bAccess: result.data.b2bAccess,
        crmAccess: result.data.crmAccess,
        superAdmin: result.data.superAdmin,
      },
    };
  },

  async getMobileToken(): Promise<Result<{ token: string }>> {
    return ApiClient.post<{ token: string }>("/api/auth/desktop-token", {});
  },
};
