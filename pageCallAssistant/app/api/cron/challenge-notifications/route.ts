import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToCircleMembers } from "@/lib/webpush";

// GET /api/cron/challenge-notifications?secret=CRON_SECRET
// Run every 5 minutes via Railway cron or external service.
// Sends push notifications when:
//  1. A challenge just became active (started in last 5 min)
//  2. A challenge is ending in 2h and members haven't submitted yet
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursAndFiveMin = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000);

  let started = 0;
  let ending = 0;

  // 1. Challenges that just started (startsAt between 5min ago and now)
  const justStarted = await db.challenge.findMany({
    where: { startsAt: { gte: fiveMinAgo, lte: now } },
    include: { circle: { select: { name: true } } },
  });

  for (const ch of justStarted) {
    await sendPushToCircleMembers(ch.circleId, null, {
      title: `Desafio disponível em ${ch.circle.name} 🚀`,
      body: `"${ch.title}" está aberto agora. Responda antes de ${new Date(ch.endsAt).toLocaleDateString("pt-BR")}!`,
      url: `/network/${ch.circleId}/challenge/${ch.id}`,
    }).catch(console.error);
    started++;
  }

  // 2. Challenges ending in ~2h — notify members who haven't submitted
  const endingSoon = await db.challenge.findMany({
    where: { endsAt: { gte: twoHoursFromNow, lte: twoHoursAndFiveMin } },
    include: {
      circle: { select: { name: true } },
      submissions: { select: { userId: true } },
    },
  });

  for (const ch of endingSoon) {
    const submittedUserIds = new Set(ch.submissions.map((s) => s.userId));

    const members = await db.circleMember.findMany({
      where: { circleId: ch.circleId, status: "active" },
      select: { userId: true },
    });

    const pendingUserIds = members
      .map((m) => m.userId)
      .filter((id) => !submittedUserIds.has(id));

    if (pendingUserIds.length === 0) continue;

    const hoursLeft = Math.round((new Date(ch.endsAt).getTime() - now.getTime()) / 3600000);

    await sendPushToCircleMembers(ch.circleId, null, {
      title: `⏰ Desafio encerrando em ${ch.circle.name}`,
      body: `"${ch.title}" encerra em ${hoursLeft}h. Você ainda não respondeu!`,
      url: `/network/${ch.circleId}/challenge/${ch.id}`,
    }).catch(console.error);

    ending++;
  }

  return NextResponse.json({ ok: true, started, ending, checkedAt: now.toISOString() });
}
