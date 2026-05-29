import * as SecureStore from "expo-secure-store";

const USER_KEY = "sf_remembered_user_v1";

export interface RememberedUser {
  name: string;
  email: string;
}

export const UserStorage = {
  async get(): Promise<RememberedUser | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as RememberedUser;
    } catch {
      return null;
    }
  },

  async save(user: RememberedUser): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // ignore
    }
  },
};
