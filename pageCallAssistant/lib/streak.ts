import { db } from "./db";

/** Returns today's date as "YYYY-MM-DD" in Brazil time (UTC-3). */
export function getBRTDateString(date = new Date()): string {
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

/**
 * Register a daily activity for a user.
 * Increments the streak if the last activity was yesterday,
 * resets to 1 if a day was missed.
 * Safe to call multiple times per day — only the first call counts.
 */
export async function registerActivity(userId: string): Promise<void> {
  const today = getBRTDateString();

  const existing = await db.dailyStreak.findUnique({ where: { userId } });

  if (!existing) {
    await db.dailyStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today },
    });
    return;
  }

  if (existing.lastActivityDate === today) return;

  const yesterday = getBRTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const newStreak = existing.lastActivityDate === yesterday ? existing.currentStreak + 1 : 1;
  const longestStreak = Math.max(existing.longestStreak, newStreak);

  await db.dailyStreak.update({
    where: { userId },
    data: { currentStreak: newStreak, longestStreak, lastActivityDate: today },
  });
}
