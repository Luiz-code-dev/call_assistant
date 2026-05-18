import type { IAuthRepository } from "@domain/repositories/IAuthRepository";
import type { RegisterCredentials } from "@domain/entities/User";
import type { Result } from "@shared/types";
import { registerSchema } from "@shared/utils/validation";

export class RegisterUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(credentials: RegisterCredentials): Promise<Result<void>> {
    const parsed = registerSchema.safeParse(credentials);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          message: parsed.error.errors[0]?.message ?? "Dados inválidos",
          statusCode: 422,
        },
      };
    }
    return this.authRepository.register(parsed.data);
  }
}
