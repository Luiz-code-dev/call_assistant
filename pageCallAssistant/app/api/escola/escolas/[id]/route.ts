import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = await req.json();

  // Valida INEP (8 dígitos, único na rede) quando enviado
  if (typeof body.inepCode === "string" && body.inepCode.trim()) {
    const inep = body.inepCode.trim();
    if (!/^\d{8}$/.test(inep)) return NextResponse.json({ error: "O código INEP deve ter 8 dígitos." }, { status: 400 });
    const exists = await prismaEdu.eduSchool.findFirst({ where: { networkId: ctx.networkId, inepCode: inep, id: { not: params.id } } });
    if (exists) return NextResponse.json({ error: "Já existe uma escola com este código INEP na rede." }, { status: 409 });
  }

  // Bloqueia desativação se houver turmas ativas no ano letivo atual
  if (body.isActive === false) {
    const currentYear = await prismaEdu.eduSchoolYear.findFirst({ where: { networkId: ctx.networkId, isCurrent: true }, select: { id: true } });
    const activeClasses = await prismaEdu.eduClass.count({
      where: { networkId: ctx.networkId, schoolId: params.id, isActive: true, ...(currentYear ? { schoolYearId: currentYear.id } : {}) },
    });
    if (activeClasses > 0) {
      return NextResponse.json(
        { error: `Esta escola tem ${activeClasses} turma${activeClasses !== 1 ? "s" : ""} ativa${activeClasses !== 1 ? "s" : ""}. Transfira ou encerre as turmas antes de desativar.` },
        { status: 409 }
      );
    }
  }

  const school = await prismaEdu.eduSchool.update({
    where: { id: params.id, networkId: ctx.networkId },
    data: { name: body.name, inepCode: body.inepCode, isActive: body.isActive },
  });
  return NextResponse.json({ school });
}
