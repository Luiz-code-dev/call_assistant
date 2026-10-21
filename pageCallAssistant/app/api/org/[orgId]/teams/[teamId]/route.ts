import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string; teamId: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { name, focus } = await req.json().catch(() => ({}));

  const updated = await (db as any).orgTeam.update({
    where: { id: params.teamId },
    data: {
      ...(name ? { name } : {}),
      ...(focus !== undefined ? { focus } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await (db as any).orgTeam.delete({ where: { id: params.teamId } });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { memberId } = await req.json().catch(() => ({}));
  if (!memberId) return NextResponse.json({ error: "memberId é obrigatório." }, { status: 400 });

  const member = await (db as any).orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== params.orgId) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  const tm = await (db as any).orgTeamMember.upsert({
    where: { teamId_memberId: { teamId: params.teamId, memberId } },
    create: { teamId: params.teamId, memberId },
    update: {},
  });

  return NextResponse.json(tm, { status: 201 });
}
