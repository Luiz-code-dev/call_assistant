import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "@shared/constants/config";

/**
 * TokenStorage — armazena o JWT em hardware-backed encrypted storage.
 * Nunca usar AsyncStorage para tokens (não é criptografado).
 */
export const TokenStorage = {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignorar erro ao limpar token inexistente
    }
  },
};
