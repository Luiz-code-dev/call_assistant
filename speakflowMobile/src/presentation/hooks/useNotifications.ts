import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@presentation/stores/authStore";
import { NotificationsApi } from "@infrastructure/api/NotificationsApi";

/**
 * Configura push notifications nativas.
 * Solicita permissão → obtém Expo Push Token → registra no backend.
 * Deve ser chamado apenas quando o usuário está autenticado.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokenRegistered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || tokenRegistered.current) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    async function registerForPushNotifications() {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") return;

      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      if (!token.data) return;

      const platform = Platform.OS === "ios" ? "ios" : "android";
      await NotificationsApi.registerToken(token.data, platform);
      tokenRegistered.current = true;
    }

    registerForPushNotifications().catch(console.error);
  }, [isAuthenticated]);
}
