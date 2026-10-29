import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";


function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const members = await prismaEdu.eduMembership.findMany({
    where: { networkId: ctx.networkId },
    include: { user: { select: { name: true, email: true } }, school: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { email, role, schoolId } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "E-mail e papel são obrigatórios" }, { status: 400 });
  const user = await prismaEdu.eduUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado na rede." }, { status: 404 });
  const existing = await prismaEdu.eduMembership.findFirst({ where: { networkId: ctx.networkId, userId: user.id, role, schoolId: schoolId || null } });
  if (existing) {
    if (existing.isActive) return NextResponse.json({ error: "Vínculo já existe" }, { status: 409 });
    const updated = await prismaEdu.eduMembership.update({ where: { id: existing.id }, data: { isActive: true } });
    return NextResponse.json({ member: updated }, { status: 200 });
  }
  const member = await prismaEdu.eduMembership.create({
    data: { networkId: ctx.networkId, userId: user.id, role, schoolId: schoolId || null },
  });
  return NextResponse.json({ member }, { status: 201 });
}
