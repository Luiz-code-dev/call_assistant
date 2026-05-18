import { create } from "zustand";
import type { User } from "@domain/entities/User";
import { TokenStorage } from "@infrastructure/storage/TokenStorage";
import { AuthApi } from "@infrastructure/api/AuthApi";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  setAuth: (user: User, token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true });
    const stored = await TokenStorage.get();
    if (!stored) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const result = await AuthApi.getMe();
    if (result.ok) {
      set({ user: result.data, token: stored, isAuthenticated: true, isLoading: false });
    } else {
      await TokenStorage.clear();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  setAuth: async (user: User, token: string) => {
    await TokenStorage.set(token);
    set({ user, token, isAuthenticated: true });
  },

  refreshUser: async () => {
    const result = await AuthApi.getMe();
    if (result.ok) {
      set({ user: result.data });
    } else if (result.error.statusCode === 401) {
      await get().logout();
    }
  },

  logout: async () => {
    await TokenStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
