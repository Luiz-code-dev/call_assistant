import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ count: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = await (db as any).friendship.count({
    where: { addresseeId: session.sub, status: "pending" },
  });

  return NextResponse.json({ count });
}
