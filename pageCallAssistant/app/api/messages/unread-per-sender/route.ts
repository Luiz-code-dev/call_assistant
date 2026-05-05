import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (db as any).message.groupBy({
    by: ["senderId"],
    where: { receiverId: session.sub, isRead: false },
    _count: { _all: true },
  });

  // { [senderId]: count }
  const result: Record<string, number> = {};
  for (const r of rows) result[r.senderId] = r._count._all;

  return NextResponse.json(result);
}
