import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/superAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orgs = await (db as any).organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
    },
    where: { deletedAt: null },
  });

  const ownerIds = Array.from(new Set(orgs.map((o: any) => o.ownerId as string)));
  const owners = await (db as any).user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, name: true, email: true, b2bSeatLimit: true },
  });
  const ownerMap = Object.fromEntries(owners.map((u: any) => [u.id, u]));

  return NextResponse.json(orgs.map((o: any) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    seatLimit: o.seatLimit,
    memberCount: o._count.members,
    isActive: o.isActive,
    suspendedAt: o.suspendedAt,
    createdAt: o.createdAt,
    industry: o.industry,
    cnpj: o.cnpj,
    cnpjStatus: o.cnpjStatus,
    owner: ownerMap[o.ownerId] ?? null,
  })));
}

export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { orgId, seatLimit, isActive, plan } = await req.json().catch(() => ({}));
  if (!orgId) return NextResponse.json({ error: "orgId obrigatório." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (seatLimit !== undefined) data.seatLimit = Math.max(1, parseInt(seatLimit) || 1);
  if (isActive !== undefined) {
    data.isActive = Boolean(isActive);
    data.suspendedAt = isActive ? null : new Date();
  }
  if (plan !== undefined) data.plan = plan;

  const updated = await (db as any).organization.update({ where: { id: orgId }, data });
  return NextResponse.json({ ok: true, org: updated });
}
