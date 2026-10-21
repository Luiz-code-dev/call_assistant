import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { db } from "./db";

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export async function sendExpoPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = await (db as any).user.findMany({
    where: { id: { in: userIds }, fcmToken: { not: null } },
    select: { id: true, fcmToken: true },
  });

  const messages: ExpoPushMessage[] = users
    .filter((u: { fcmToken: string }) => Expo.isExpoPushToken(u.fcmToken))
    .map((u: { fcmToken: string }) => ({
      to: u.fcmToken,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default" as const,
      priority: "high" as const,
    }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      // Cleanup invalid tokens
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const token = (chunk[i] as ExpoPushMessage & { to: string }).to;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).user.updateMany({
            where: { fcmToken: token },
            data: { fcmToken: null, fcmPlatform: null },
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[expoPush] sendPushNotificationsAsync error:", err);
    }
  }
}

export async function sendExpoPushToCircleMembers(
  circleId: string,
  excludeUserId: string | null,
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  const members = await db.circleMember.findMany({
    where: { circleId, status: "active" },
    select: { userId: true },
  });

  const userIds = members
    .map((m) => m.userId)
    .filter((id) => id !== excludeUserId);

  await sendExpoPushToUsers(userIds, payload);
}
