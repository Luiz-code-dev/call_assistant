import { NextRequest, NextResponse } from "next/server";
import { getToolSession } from "../../../tools/_auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getToolSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { plan: true, b2bAccess: true },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isPaidOrB2B = user.b2bAccess || user.plan === "basic" || user.plan === "premium";
  if (!isPaidOrB2B) {
    return NextResponse.json({ sessions: [], hasHistory: false });
  }

  const take = user.b2bAccess || user.plan === "premium" ? 100 : 5;

  const sessions = await (db as any).buddySession.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      language: true,
      topic: true,
      title: true,
      messageCount: true,
      wordsLearned: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ sessions, hasHistory: true });
}
