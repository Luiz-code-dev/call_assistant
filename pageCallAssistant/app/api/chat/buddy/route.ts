import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "../../tools/_auth";
import { buildBuddySystemPrompt } from "@/lib/buddy-prompt";
import { getOpenAI } from "@/lib/openai";
import { db } from "@/lib/db";

const BUDDY_CREDITS_PER_MSG = 1;

const DAILY_LIMIT: Record<string, number> = {
  free: 10,
  basic: 50,
  premium: Infinity,
};

function getBRTDateString(date?: Date): string {
  const d = date ?? new Date();
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseSuggestions(raw: string): { pt: string; en: string }[] {
  try {
    const match = raw.match(/---SUGGESTIONS---\s*(\[[\s\S]*?\])/);
    if (!match) return [];
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function stripSuggestions(raw: string): string {
  return raw.replace(/---SUGGESTIONS---[\s\S]*$/, "").trim();
}

export async function POST(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { message, sessionId, language = "pt-BR", topic, history = [] } = body as {
    message: string;
    sessionId: string;
    language?: string;
    topic?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) return NextResponse.json({ error: "Mensagem obrigatória." }, { status: 400 });
  if (!sessionId) return NextResponse.json({ error: "sessionId obrigatório." }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { plan: true, credits: true, b2bAccess: true },
  });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const isB2B = user.b2bAccess;
  const plan = user.plan as string;

  // Check daily message limit (non-B2B only)
  if (!isB2B) {
    const today = getBRTDateString();
    const todayStart = new Date(today + "T03:00:00.000Z"); // BRT midnight = UTC-3
    const todayMsgCount = await (db as any).buddyMessage.count({
      where: {
        session: { userId: session.sub },
        role: "user",
        createdAt: { gte: todayStart },
      },
    });

    const limit = DAILY_LIMIT[plan] ?? 10;
    if (todayMsgCount >= limit) {
      return NextResponse.json(
        {
          error: "daily_limit_reached",
          message: `Você atingiu o limite de ${limit} mensagens hoje.`,
          plan,
        },
        { status: 429 }
      );
    }

    // Check credits
    if (user.credits < BUDDY_CREDITS_PER_MSG) {
      return NextResponse.json(
        { error: "credits_insufficient", message: "Créditos insuficientes.", credits: user.credits },
        { status: 402 }
      );
    }
  }

  // Build OpenAI messages (last 20 history entries)
  const recentHistory = history.slice(-20);
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildBuddySystemPrompt(language, topic) },
      ...recentHistory,
      { role: "user", content: message },
    ],
    max_tokens: 600,
    temperature: 0.8,
  });

  const rawReply = completion.choices[0].message.content ?? "";
  const reply = stripSuggestions(rawReply);
  const suggestions = language === "pt-BR" ? parseSuggestions(rawReply) : [];

  // Persist messages + debit credits (non-free always persist; free only persists for daily limit tracking)
  const isPaidOrB2B = isB2B || plan === "basic" || plan === "premium";

  await db.$transaction(async (tx) => {
    // Upsert BuddySession
    const buddySession = await (tx as any).buddySession.upsert({
      where: { id: sessionId },
      update: {
        messageCount: { increment: 2 },
        wordsLearned: { increment: suggestions.length },
        language,
        ...(topic ? { topic } : {}),
      },
      create: {
        id: sessionId,
        userId: session.sub,
        language,
        topic,
        messageCount: 2,
        wordsLearned: suggestions.length,
      },
    });

    // Always save messages (needed for daily limit check on free plan)
    await (tx as any).buddyMessage.createMany({
      data: [
        { sessionId: buddySession.id, role: "user", content: message },
        { sessionId: buddySession.id, role: "assistant", content: reply },
      ],
    });

    // Debit 1 credit (non-B2B only)
    if (!isB2B) {
      await tx.user.update({
        where: { id: session.sub },
        data: { credits: { decrement: BUDDY_CREDITS_PER_MSG } },
      });
      await tx.creditTransaction.create({
        data: {
          userId: session.sub,
          type: "debit",
          amount: BUDDY_CREDITS_PER_MSG,
          source: "buddy_chat",
          description: "SpeakFlow Buddy — mensagem",
        },
      });
    }

    // Update streak on 5th message of the session
    if (buddySession.messageCount >= 10) {
      // messageCount just became >= 10 means 5 user msgs sent (we count both sides)
      const today = getBRTDateString();
      const existing = await tx.dailyStreak.findUnique({ where: { userId: session.sub } });
      const yesterday = getBRTDateString(new Date(Date.now() - 86400000));
      const newStreak =
        existing?.lastActivityDate === today
          ? existing.currentStreak
          : existing?.lastActivityDate === yesterday
          ? (existing.currentStreak ?? 0) + 1
          : 1;
      const longest = Math.max(newStreak, existing?.longestStreak ?? 0);
      await tx.dailyStreak.upsert({
        where: { userId: session.sub },
        update: { lastActivityDate: today, currentStreak: newStreak, longestStreak: longest },
        create: { userId: session.sub, lastActivityDate: today, currentStreak: 1, longestStreak: 1 },
      });
    }

    return buddySession;
  });

  const updatedUser = await db.user.findUnique({
    where: { id: session.sub },
    select: { credits: true },
  });

  const sessionMsgCount = await (db as any).buddyMessage.count({ where: { sessionId, role: "user" } });

  return NextResponse.json({
    reply,
    suggestions,
    creditsRemaining: isB2B ? null : (updatedUser?.credits ?? 0),
    sessionMessageCount: sessionMsgCount,
  });
}
