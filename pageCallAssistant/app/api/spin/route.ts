import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBRTDateString } from "@/lib/streak";

// ─── Prize tables ────────────────────────────────────────────────────────────
// weights must sum to 100 (or any total — we normalise them)
const REGULAR_SLOTS = [
  { credits: 2,   label: "2 créditos",   weight: 30 },
  { credits: 2,   label: "2 créditos",   weight: 22 },
  { credits: 5,   label: "5 créditos",   weight: 20 },
  { credits: 5,   label: "5 créditos",   weight: 12 },
  { credits: 10,  label: "10 créditos",  weight: 9  },
  { credits: 25,  label: "25 créditos",  weight: 5  },
  { credits: 50,  label: "50 créditos",  weight: 1.5},
  { credits: 100, label: "🎉 JACKPOT! 100 cr", weight: 0.5 },
];

const PREMIUM_SLOTS = [
  { credits: 4,   label: "4 créditos",   weight: 30 },
  { credits: 4,   label: "4 créditos",   weight: 22 },
  { credits: 10,  label: "10 créditos",  weight: 20 },
  { credits: 10,  label: "10 créditos",  weight: 12 },
  { credits: 20,  label: "20 créditos",  weight: 9  },
  { credits: 50,  label: "50 créditos",  weight: 5  },
  { credits: 100, label: "100 créditos", weight: 1.5},
  { credits: 200, label: "💎 JACKPOT! 200 cr", weight: 0.5 },
];

function pickSlot(slots: typeof REGULAR_SLOTS): number {
  const total = slots.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < slots.length; i++) {
    r -= slots[i].weight;
    if (r <= 0) return i;
  }
  return slots.length - 1;
}

// ─── GET /api/spin — streak status + can spin today? ─────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const today = getBRTDateString();
  const streak = await db.dailyStreak.findUnique({ where: { userId: session.sub } });

  const canSpin = !streak || streak.lastSpinDate !== today;
  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const isPremiumSpin = currentStreak > 0 && currentStreak % 10 === 0 && canSpin;

  const history = await db.spinHistory.findMany({
    where: { userId: session.sub },
    orderBy: { spunAt: "desc" },
    take: 7,
  });

  return NextResponse.json({ canSpin, currentStreak, longestStreak, isPremiumSpin, history });
}

// ─── POST /api/spin — execute spin, award credits ─────────────────────────────
export async function POST() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const today = getBRTDateString();

  // Upsert streak to lock the spin for today (atomic-ish)
  const streak = await db.dailyStreak.findUnique({ where: { userId: session.sub } });

  if (streak?.lastSpinDate === today) {
    return NextResponse.json({ error: "Você já girou hoje. Volte amanhã! 😊" }, { status: 409 });
  }

  const currentStreak = streak?.currentStreak ?? 0;
  const isPremium = currentStreak > 0 && currentStreak % 10 === 0;
  const slots = isPremium ? PREMIUM_SLOTS : REGULAR_SLOTS;
  const slot = pickSlot(slots);
  const prize = slots[slot];

  // Register activity (also updates streak)
  const lastActivity = streak?.lastActivityDate;
  const yesterday = getBRTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const newStreak = lastActivity === today
    ? (streak?.currentStreak ?? 1)
    : lastActivity === yesterday
      ? (streak?.currentStreak ?? 0) + 1
      : 1;
  const longestStreak = Math.max(streak?.longestStreak ?? 0, newStreak);

  // Run all DB writes in parallel
  await Promise.all([
    // Mark spin as done + update streak
    db.dailyStreak.upsert({
      where: { userId: session.sub },
      update: { lastSpinDate: today, lastActivityDate: today, currentStreak: newStreak, longestStreak },
      create: { userId: session.sub, lastSpinDate: today, lastActivityDate: today, currentStreak: 1, longestStreak: 1 },
    }),
    // Award credits
    db.user.update({
      where: { id: session.sub },
      data: { credits: { increment: prize.credits } },
    }),
    // Log transaction
    db.creditTransaction.create({
      data: {
        userId: session.sub,
        type: "earn",
        amount: prize.credits,
        source: isPremium ? "spin_premium" : "spin_daily",
        description: isPremium ? `Giro Premium 🔥 — ${prize.label}` : `Giro da Sorte — ${prize.label}`,
      },
    }),
    // Log spin history
    db.spinHistory.create({
      data: { userId: session.sub, credits: prize.credits, prizeLabel: prize.label, isPremium },
    }),
  ]);

  const user = await db.user.findUnique({ where: { id: session.sub }, select: { credits: true } });

  return NextResponse.json({
    slot,
    credits: prize.credits,
    prizeLabel: prize.label,
    isPremium,
    newStreak,
    longestStreak,
    newBalance: user?.credits ?? 0,
  });
}
