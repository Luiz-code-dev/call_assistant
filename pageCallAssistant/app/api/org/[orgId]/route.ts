import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const data = await (db as any).organization.findUnique({
    where: { id: params.orgId, deletedAt: null },
    include: {
      _count: { select: { members: true, teams: true, challenges: true } },
    },
  });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ...data, role: org.role });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, logoUrl, industry, domain } = body;

  const updated = await (db as any).organization.update({
    where: { id: params.orgId },
    data: {
      ...(name ? { name } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(industry !== undefined ? { industry } : {}),
      ...(domain !== undefined ? { domain } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "owner")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await (db as any).organization.update({
    where: { id: params.orgId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
