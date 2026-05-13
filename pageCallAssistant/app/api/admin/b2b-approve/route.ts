import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendB2BApprovalEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS    = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase());
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const headerSecret = req.headers.get("x-internal-secret");
  if (INTERNAL_SECRET && headerSecret === INTERNAL_SECRET) return true;

  const session = await getSession();
  if (!session) return false;
  const user = await (db as any).user.findUnique({ where: { id: session.sub }, select: { email: true } });
  return !!user && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email, revoke } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  const target = await (db as any).user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await (db as any).user.update({
    where: { id: target.id },
    data: { b2bAccess: !revoke },
  });

  if (!revoke) {
    sendB2BApprovalEmail(target.email, target.name ?? "").catch(() => {});
  }

  return NextResponse.json({ ok: true, b2bAccess: !revoke, email: target.email, name: target.name });
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const email  = req.nextUrl.searchParams.get("email");
  const revoke = req.nextUrl.searchParams.get("revoke") === "1";

  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!email) return NextResponse.json({ error: "email obrigatório." }, { status: 400 });

  const target = await (db as any).user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await (db as any).user.update({
    where: { id: target.id },
    data: { b2bAccess: !revoke },
  });

  if (!revoke) {
    sendB2BApprovalEmail(target.email, target.name ?? "").catch(() => {});
  }

  return NextResponse.json({ ok: true, b2bAccess: !revoke, email: target.email, name: target.name });
}
