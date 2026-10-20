import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const currentYear = await prismaEdu.eduSchoolYear.findFirst({ where: { networkId: ctx.networkId, isCurrent: true } });
  if (!currentYear) return NextResponse.json({ terms: [] });
  const terms = await prismaEdu.eduTerm.findMany({ where: { schoolYearId: currentYear.id }, orderBy: { order: "asc" } });
  return NextResponse.json({ terms });
}
