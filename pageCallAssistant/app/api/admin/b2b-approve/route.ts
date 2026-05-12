import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase());

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const user = await (db as any).user.findUnique({ where: { id: session.sub }, select: { email: true } });
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email, revoke } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  const updated = await (db as any).user.updateMany({
    where: { email: email.toLowerCase() },
    data: { b2bAccess: revoke ? false : true },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, b2bAccess: !revoke, email });
}
