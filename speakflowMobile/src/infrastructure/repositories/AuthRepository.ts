import type { IAuthRepository } from "@domain/repositories/IAuthRepository";
import type { User, LoginCredentials, RegisterCredentials, AuthTokens } from "@domain/entities/User";
import type { Result } from "@shared/types";
import { AuthApi } from "@infrastructure/api/AuthApi";
import { TokenStorage } from "@infrastructure/storage/TokenStorage";

export class AuthRepository implements IAuthRepository {
  async login(
    credentials: LoginCredentials
  ): Promise<Result<{ user: User; tokens: AuthTokens }>> {
    const result = await AuthApi.login(credentials.email, credentials.password);
    if (!result.ok) return result;

    return {
      ok: true,
      data: {
        user: {
          id: result.data.user.id,
          name: result.data.user.name,
          email: result.data.user.email,
          plan: result.data.user.plan as User["plan"],
          credits: 0,
          avatarUrl: null,
          b2bAccess: false,
          crmAccess: false,
          superAdmin: false,
        },
        tokens: { token: result.data.token },
      },
    };
  }

  async register(credentials: RegisterCredentials): Promise<Result<void>> {
    return AuthApi.register(credentials.name, credentials.email, credentials.password);
  }

  async getMe(token: string): Promise<Result<User>> {
    void token;
    return AuthApi.getMe();
  }

  async logout(): Promise<void> {
    await TokenStorage.clear();
  }
}
