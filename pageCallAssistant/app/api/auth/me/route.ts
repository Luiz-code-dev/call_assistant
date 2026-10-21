import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (db as any).user.findUnique({
    where: { id: payload.sub },
    include: { _count: { select: { orgMemberships: true } } },
  });

  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
  }

  const rootEmail = (process.env.ROOT_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const isSuperAdmin = user.superAdmin === true || (!!rootEmail && user.email.toLowerCase() === rootEmail);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username ?? null,
    plan: user.plan,
    credits: user.credits ?? 0,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    b2bAccess: user.b2bAccess ?? false,
    orgCount: user._count?.orgMemberships ?? 0,
    superAdmin: isSuperAdmin,
    crmAccess: isSuperAdmin || user.crmAccess === true,
    hasSeenOnboarding: user.hasSeenOnboarding ?? false,
  });
}
