import type { User, LoginCredentials, RegisterCredentials, AuthTokens } from "@domain/entities/User";
import type { Result } from "@shared/types";

export interface IAuthRepository {
  login(credentials: LoginCredentials): Promise<Result<{ user: User; tokens: AuthTokens }>>;
  register(credentials: RegisterCredentials): Promise<Result<void>>;
  getMe(token: string): Promise<Result<User>>;
  logout(): Promise<void>;
}
