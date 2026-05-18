import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

type Ctx = { params: { orgId: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "token_invalid" }, { status: 401 });

  const membership = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: params.orgId, userId: payload.sub } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const members = await (db as any).orgMember.findMany({
    where: { orgId: params.orgId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true, credits: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ members, myRole: membership.role });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "token_invalid" }, { status: 401 });

  const membership = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: params.orgId, userId: payload.sub } },
    select: { role: true },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email, role = "member" } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });

  const existing = await (db as any).orgInvite.findFirst({
    where: { orgId: params.orgId, email: email.toLowerCase(), status: "pending" },
  });
  if (existing) return NextResponse.json({ error: "Convite já enviado para este e-mail." }, { status: 409 });

  const invite = await (db as any).orgInvite.create({
    data: {
      orgId: params.orgId,
      email: email.toLowerCase(),
      role: ["admin", "member"].includes(role) ? role : "member",
      invitedBy: payload.sub,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
