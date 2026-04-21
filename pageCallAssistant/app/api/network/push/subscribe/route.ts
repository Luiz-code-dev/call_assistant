import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { endpoint, keys } = await req.json().catch(() => ({}));
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return NextResponse.json({ error: "Dados de subscription inválidos." }, { status: 400 });

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: session.sub, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { endpoint } = await req.json().catch(() => ({}));
  if (!endpoint) return NextResponse.json({ error: "endpoint obrigatório." }, { status: 400 });

  await db.pushSubscription.deleteMany({ where: { endpoint, userId: session.sub } });
  return NextResponse.json({ ok: true });
}
