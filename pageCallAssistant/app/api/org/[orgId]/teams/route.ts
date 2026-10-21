import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const teams = await (db as any).orgTeam.findMany({
    where: { orgId: params.orgId },
    include: {
      _count: { select: { members: true, challenges: true } },
      members: {
        include: {
          member: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
        take: 5,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(teams);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { name, focus } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Nome do time é obrigatório." }, { status: 400 });

  const team = await (db as any).orgTeam.create({
    data: { orgId: params.orgId, name: name.trim(), focus: focus ?? null },
  });

  return NextResponse.json(team, { status: 201 });
}
