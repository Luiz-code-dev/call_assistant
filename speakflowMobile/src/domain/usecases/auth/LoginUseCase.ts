import type { IAuthRepository } from "@domain/repositories/IAuthRepository";
import type { LoginCredentials, User, AuthTokens } from "@domain/entities/User";
import type { Result } from "@shared/types";
import { loginSchema } from "@shared/utils/validation";

export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(
    credentials: LoginCredentials
  ): Promise<Result<{ user: User; tokens: AuthTokens }>> {
    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          message: parsed.error.errors[0]?.message ?? "Dados inválidos",
          statusCode: 422,
        },
      };
    }
    return this.authRepository.login(parsed.data);
  }
}
