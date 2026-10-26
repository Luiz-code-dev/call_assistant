import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rows = await prismaEdu.eduSchool.findMany({
    where: { networkId: ctx.networkId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { classes: true } },
      memberships: { where: { role: "SCHOOL_ADMIN", isActive: true }, select: { id: true }, take: 1 },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schools = rows.map((s: any) => ({
    id: s.id, name: s.name, inepCode: s.inepCode, isActive: s.isActive,
    classCount: s._count?.classes ?? 0, hasDirector: (s.memberships?.length ?? 0) > 0,
  }));
  return NextResponse.json({ schools });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { name, inepCode } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const inep = inepCode?.trim() || null;
  if (inep) {
    if (!/^\d{8}$/.test(inep)) return NextResponse.json({ error: "O código INEP deve ter 8 dígitos." }, { status: 400 });
    const exists = await prismaEdu.eduSchool.findFirst({ where: { networkId: ctx.networkId, inepCode: inep } });
    if (exists) return NextResponse.json({ error: "Já existe uma escola com este código INEP na rede." }, { status: 409 });
  }

  const school = await prismaEdu.eduSchool.create({
    data: { networkId: ctx.networkId, name: name.trim(), inepCode: inep },
  });
  return NextResponse.json({ school }, { status: 201 });
}
