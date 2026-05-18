import { ApiClient } from "@infrastructure/http/ApiClient";
import type { Result } from "@shared/types";

export const NotificationsApi = {
  async registerToken(fcmToken: string, platform: "ios" | "android"): Promise<Result<void>> {
    return ApiClient.post<void>("/api/push/register-fcm", { fcmToken, platform });
  },

  async unregisterToken(fcmToken: string): Promise<Result<void>> {
    return ApiClient.post<void>("/api/push/unregister-fcm", { fcmToken });
  },
};
