import { db } from "./db";
import { sendPushToUsers } from "./webpush";
import { sendBadgeEmail } from "./email";

export interface BadgeDef {
  slug: string;
  emoji: string;
  name: string;
  description: string;
}

export const ALL_BADGES: BadgeDef[] = [
  { slug: "challenge-first", emoji: "🎯", name: "Primeiro Desafio",    description: "Você completou seu primeiro desafio!" },
  { slug: "quiz-ace",        emoji: "🧠", name: "Quiz Perfeito",       description: "Acertou 100% das questões num quiz!" },
  { slug: "high-scorer",    emoji: "⭐", name: "Nota Alta",            description: "Conquistou score 9+ numa avaliação de texto!" },
  { slug: "live-first",     emoji: "🎤", name: "1ª Sessão Live",      description: "Completou sua primeira sessão ao vivo!" },
  { slug: "live-10",        emoji: "🔥", name: "10 Sessões Live",     description: "Completou 10 sessões ao vivo!" },
  { slug: "live-50",        emoji: "💬", name: "50 Sessões Live",     description: "Veterano do SpeakFlow Live!" },
  { slug: "tool-user",      emoji: "🔧", name: "Ferramenteiro",       description: "Usou uma ferramenta do SpeakFlow!" },
];

export interface BadgeCheckMeta {
  quizCorrect?: number;
  quizTotal?: number;
  quizScoreOn10?: number;
  evalScore?: number;
}

export async function checkAndAwardBadges(
  userId: string,
  context: "submission" | "quiz" | "evaluation" | "live" | "tool",
  meta: BadgeCheckMeta = {}
): Promise<BadgeDef[]> {
  const existing = await db.userBadge.findMany({
    where: { userId },
    select: { slug: true },
  });
  const have = new Set(existing.map((b) => b.slug));

  const toAward: string[] = [];

  if (context === "submission" || context === "quiz") {
    if (!have.has("challenge-first")) toAward.push("challenge-first");

    if (context === "quiz") {
      const { quizCorrect, quizTotal, quizScoreOn10 } = meta;
      if (!have.has("quiz-ace") && quizTotal && quizTotal > 0 && quizCorrect === quizTotal)
        toAward.push("quiz-ace");
      if (!have.has("high-scorer") && quizScoreOn10 !== undefined && quizScoreOn10 >= 9)
        toAward.push("high-scorer");
    }
  }

  if (context === "evaluation") {
    if (!have.has("challenge-first")) toAward.push("challenge-first");
    if (!have.has("high-scorer") && meta.evalScore !== undefined && meta.evalScore >= 9)
      toAward.push("high-scorer");
  }

  if (context === "live") {
    const sessionCount = await db.callSession.count({ where: { userId } });
    if (!have.has("live-first") && sessionCount >= 1) toAward.push("live-first");
    if (!have.has("live-10")    && sessionCount >= 10) toAward.push("live-10");
    if (!have.has("live-50")    && sessionCount >= 50) toAward.push("live-50");
  }

  if (context === "tool") {
    if (!have.has("tool-user")) toAward.push("tool-user");
  }

  if (toAward.length === 0) return [];

  const newBadges: BadgeDef[] = [];
  for (const slug of toAward) {
    try {
      await db.userBadge.create({ data: { userId, slug } });
      const def = ALL_BADGES.find((b) => b.slug === slug);
      if (def) newBadges.push(def);
    } catch {
      // unique constraint — badge already exists, skip
    }
  }

  if (newBadges.length > 0) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user) {
      await Promise.allSettled([
        sendPushToUsers([userId], {
          title: "🏅 Conquista desbloqueada!",
          body: `${newBadges[0].emoji} ${newBadges[0].name} — ${newBadges[0].description}`,
          url: "/progress",
        }),
        sendBadgeEmail(user.email, user.name, newBadges),
      ]);
    }
  }

  return newBadges;
}
