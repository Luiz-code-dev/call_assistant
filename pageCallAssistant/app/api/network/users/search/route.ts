import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase().replace(/^@/, "");
  const circleId = searchParams.get("circleId");

  if (!q || q.length < 2)
    return NextResponse.json([]);

  const users = await db.user.findMany({
    where: {
      AND: [
        { id: { not: session.sub } },
        {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: { id: true, name: true, email: true, avatarUrl: true, username: true },
    take: 6,
  });

  if (!circleId) return NextResponse.json(users);

  const memberIds = await db.circleMember.findMany({
    where: { circleId, userId: { in: users.map((u) => u.id) } },
    select: { userId: true, status: true },
  });
  const memberMap = new Map(memberIds.map((m) => [m.userId, m.status]));

  return NextResponse.json(
    users.map((u) => ({ ...u, memberStatus: memberMap.get(u.id) ?? null }))
  );
}
