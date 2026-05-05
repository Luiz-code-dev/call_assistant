/**
 * Self-contained cron runner — started via instrumentation.ts on server boot.
 * Runs every 5 min: challenge notifications + winner awards
 * Runs daily at 8 UTC: daily tip push
 */

import { db } from "./db";
import { sendPushToUsers, sendPushToCircleMembers } from "./webpush";

let started = false;

async function awardChallengeWinners() {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const expired = await db.challenge.findMany({
    where: {
      endsAt: { gte: fiveMinAgo, lte: now },
      // @ts-expect-error – regenerated after prisma generate in prod
      winnerAwarded: false,
    },
    select: { id: true, title: true, circleId: true },
  });

  for (const ch of expired) {
    const top = await db.submissionEvaluation.findFirst({
      where: { submission: { challengeId: ch.id } },
      orderBy: { totalScore: "desc" },
      include: { submission: { select: { userId: true } } },
    });

    if (!top) continue;

    const winnerId = top.submission.userId;
    const prize = 50;

    await db.$transaction([
      db.user.update({ where: { id: winnerId }, data: { credits: { increment: prize } } }),
      db.creditTransaction.create({
        data: {
          userId: winnerId,
          type: "earn",
          amount: prize,
          source: "challenge_winner",
          description: `🏆 Melhor colocado no desafio "${ch.title}"`,
        },
      }),
      // @ts-expect-error – regenerated after prisma generate in prod
      db.challenge.update({ where: { id: ch.id }, data: { winnerAwarded: true } }),
    ]);

    await sendPushToUsers([winnerId], {
      title: "🏆 Você ganhou o desafio!",
      body: `Melhor colocado em "${ch.title}" — +${prize} créditos adicionados!`,
      url: `/network/${ch.circleId}/challenge/${ch.id}`,
    }).catch(console.error);
  }
}

async function sendChallengeNotifications() {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursAndFiveMin = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000);

  const justStarted = await db.challenge.findMany({
    where: { startsAt: { gte: fiveMinAgo, lte: now } },
    include: { circle: { select: { name: true } } },
  });

  for (const ch of justStarted) {
    await sendPushToCircleMembers(ch.circleId, null, {
      title: `🚀 Desafio disponível em ${ch.circle.name}`,
      body: `"${ch.title}" está aberto agora!`,
      url: `/network/${ch.circleId}/challenge/${ch.id}`,
    }).catch(console.error);
  }

  const endingSoon = await db.challenge.findMany({
    where: { endsAt: { gte: twoHoursFromNow, lte: twoHoursAndFiveMin } },
    include: {
      circle: { select: { name: true } },
      submissions: { select: { userId: true } },
    },
  });

  for (const ch of endingSoon) {
    const submittedIds = new Set(ch.submissions.map((s) => s.userId));
    const members = await db.circleMember.findMany({
      where: { circleId: ch.circleId, status: "active" },
      select: { userId: true },
    });
    const pendingIds = members.map((m) => m.userId).filter((id) => !submittedIds.has(id));
    if (pendingIds.length === 0) continue;

    const hoursLeft = Math.round((new Date(ch.endsAt).getTime() - now.getTime()) / 3_600_000);
    await sendPushToUsers(pendingIds, {
      title: `⏰ Desafio encerrando em ${ch.circle.name}`,
      body: `"${ch.title}" encerra em ${hoursLeft}h. Você ainda não respondeu!`,
      url: `/network/${ch.circleId}/challenge/${ch.id}`,
    }).catch(console.error);
  }
}

const DAILY_TIPS = [
  "Use 'actually' para corrigir uma informação com naturalidade, sem soar rude.",
  "Prefira 'I'd like to' no lugar de 'I want to' para soar mais profissional.",
  "'Could you elaborate on that?' é a forma mais educada de pedir mais detalhes.",
  "Use 'I appreciate' para agradecer de forma mais sofisticada do que 'thank you'.",
  "'Let me clarify' demonstra assertividade sem soar agressivo ou defensivo.",
  "Prefira 'reach out' a 'contact' em contextos de networking e e-mails formais.",
  "'Moving forward' é a forma profissional de introduzir um próximo passo.",
  "Use 'touch base' para sugerir uma conversa rápida de alinhamento com seu time.",
];

async function sendDailyTip() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const tip = DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  const subs = await db.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  if (subs.length === 0) return;
  await sendPushToUsers(
    subs.map((s) => s.userId),
    { title: "💡 Dica do Dia — SpeakFlow", body: tip, url: "/home" }
  ).catch(console.error);
}

export function startCronJobs() {
  if (started) return;
  started = true;

  let lastTipDay = -1;

  const tick = async () => {
    try {
      await sendChallengeNotifications();
      await awardChallengeWinners();
    } catch (e) {
      console.error("[cron] challenge tick error:", e);
    }

    const hour = new Date().getUTCHours();
    const day = new Date().getUTCDate();
    if (hour === 8 && day !== lastTipDay) {
      lastTipDay = day;
      sendDailyTip().catch(console.error);
    }
  };

  setTimeout(tick, 60_000);
  setInterval(tick, 5 * 60 * 1000);
  console.log("[cron] Jobs started — 5-min challenge notifications + daily tip at 08 UTC");
}
