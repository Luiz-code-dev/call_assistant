import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

type Ctx = { params: { orgId: string; memberId: string } };

async function getSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const payload = await getSession(req);
  if (!payload) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const myMembership = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: params.orgId, userId: payload.sub } },
    select: { role: true },
  });
  if (!myMembership || !["owner", "admin"].includes(myMembership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { role, jobTitle, department } = await req.json().catch(() => ({}));

  const member = await (db as any).orgMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.orgId !== params.orgId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (member.role === "owner" && role !== undefined) {
    return NextResponse.json({ error: "Não é possível alterar o owner." }, { status: 403 });
  }
  if (role === "owner") {
    return NextResponse.json({ error: "Não é possível promover a owner via API." }, { status: 403 });
  }

  const updated = await (db as any).orgMember.update({
    where: { id: params.memberId },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(jobTitle !== undefined ? { jobTitle } : {}),
      ...(department !== undefined ? { department } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const payload = await getSession(req);
  if (!payload) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const myMembership = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: params.orgId, userId: payload.sub } },
    select: { role: true },
  });
  if (!myMembership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const member = await (db as any).orgMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.orgId !== params.orgId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isSelf = member.userId === payload.sub;
  if (!isSelf && !["owner", "admin"].includes(myMembership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (member.role === "owner") {
    return NextResponse.json({ error: "Owner não pode ser removido." }, { status: 403 });
  }

  await (db as any).orgMember.delete({ where: { id: params.memberId } });
  return NextResponse.json({ ok: true });
}
