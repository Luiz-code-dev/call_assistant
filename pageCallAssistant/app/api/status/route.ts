import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (db as any).user.findUnique({
    where: { id: session.sub },
    select: { statusText: true, statusEmoji: true, statusExpires: true, statusMediaUrl: true },
  }).catch(() => null);

  if (!user) return NextResponse.json({ status: null });

  const active = user.statusExpires && new Date(user.statusExpires) > new Date();
  return NextResponse.json(
    active
      ? { statusText: user.statusText, statusEmoji: user.statusEmoji, statusExpires: user.statusExpires, statusMediaUrl: user.statusMediaUrl }
      : { status: null }
  );
}

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { statusText, statusEmoji, statusMediaUrl, clear } = await req.json();

  if (clear) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).user.update({
      where: { id: session.sub },
      data: { statusText: null, statusEmoji: null, statusExpires: null, statusMediaUrl: null },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  if (!statusText?.trim() && !statusEmoji?.trim() && !statusMediaUrl)
    return NextResponse.json({ error: "empty_status" }, { status: 400 });
  if (statusText && statusText.length > 150)
    return NextResponse.json({ error: "too_long" }, { status: 400 });

  const statusExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).user.update({
    where: { id: session.sub },
    data: {
      statusText: statusText?.trim() ?? null,
      statusEmoji: statusEmoji?.trim() ?? null,
      statusMediaUrl: statusMediaUrl ?? null,
      statusExpires,
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true, statusExpires });
}
