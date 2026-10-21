import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

type Ctx = { params: { orgId: string } };

async function getSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const payload = await getSession(req);
  if (!payload) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const membership = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: params.orgId, userId: payload.sub } },
    select: { role: true },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const invites = await (db as any).orgInvite.findMany({
    where: { orgId: params.orgId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(invites);
}
