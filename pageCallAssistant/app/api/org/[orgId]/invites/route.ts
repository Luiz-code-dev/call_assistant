import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const invites = await (db as any).orgInvite.findMany({
    where: { orgId: params.orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(invites);
}
