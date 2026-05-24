import { useCallback, useState } from "react";
import { useAuthStore } from "@presentation/stores/authStore";
import { LoginUseCase } from "@domain/usecases/auth/LoginUseCase";
import { RegisterUseCase } from "@domain/usecases/auth/RegisterUseCase";
import { AuthRepository } from "@infrastructure/repositories/AuthRepository";

const authRepository = new AuthRepository();
const loginUseCase = new LoginUseCase(authRepository);
const registerUseCase = new RegisterUseCase(authRepository);

export function useAuth() {
  const { user, isLoading, isAuthenticated, setAuth, logout, refreshUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      setPendingVerification(false);
      setSubmitting(true);
      try {
        const result = await loginUseCase.execute({ email, password });
        if (!result.ok) {
          setPendingVerification(result.error.statusCode === 403);
          setError(result.error.message);
          return false;
        }
        setPendingVerification(false);
        const { user, tokens } = result.data;
        await setAuth(user, tokens.token);
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    [setAuth]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      setError(null);
      setSubmitting(true);
      try {
        const result = await registerUseCase.execute({ name, email, password });
        if (!result.ok) {
          setError(result.error.message);
          return false;
        }
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    submitting,
    pendingVerification,
    login,
    register,
    logout,
    refreshUser,
    clearError: () => { setError(null); setPendingVerification(false); },
  };
}
