import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";

type Ctx = { params: { orgId: string; memberId: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { role, jobTitle, department } = await req.json().catch(() => ({}));

  const member = await (db as any).orgMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.orgId !== params.orgId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isSelf = member.userId === org.userId;
  const isRoleChange = role !== undefined && role !== member.role;
  const isProfileOnly = !isRoleChange && (jobTitle !== undefined || department !== undefined);

  if (member.role === "owner" && isRoleChange) return NextResponse.json({ error: "Não é possível alterar o role do owner." }, { status: 403 });
  if (member.role === "owner" && !isSelf && !isProfileOnly) return NextResponse.json({ error: "Não é possível alterar o owner." }, { status: 403 });
  if (role === "owner") return NextResponse.json({ error: "Não é possível promover a owner via API." }, { status: 403 });

  const updated = await (db as any).orgMember.update({
    where: { id: params.memberId },
    data: {
      ...(isRoleChange ? { role } : {}),
      ...(jobTitle !== undefined ? { jobTitle } : {}),
      ...(department !== undefined ? { department } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const member = await (db as any).orgMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.orgId !== params.orgId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isSelf = member.userId === org.userId;
  if (!isSelf && !hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (member.role === "owner") return NextResponse.json({ error: "Owner não pode ser removido." }, { status: 403 });

  await (db as any).orgMember.delete({ where: { id: params.memberId } });

  return NextResponse.json({ ok: true });
}
