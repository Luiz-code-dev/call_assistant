import webpush from "web-push";
import { db } from "./db";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@speakf.com.br";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

async function removeExpiredSub(endpoint: string) {
  try { await db.pushSubscription.delete({ where: { endpoint } }); } catch {}
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  ensureVapid();

  const subs = await db.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await removeExpiredSub(sub.endpoint);
          }
        })
    )
  );
}

export async function sendPushToCircleMembers(
  circleId: string,
  excludeUserId: string | null,
  payload: { title: string; body: string; url?: string }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const members = await db.circleMember.findMany({
    where: { circleId, status: "active" },
    select: { userId: true },
  });

  const userIds = members
    .map((m) => m.userId)
    .filter((id) => id !== excludeUserId);

  await sendPushToUsers(userIds, payload);
}
