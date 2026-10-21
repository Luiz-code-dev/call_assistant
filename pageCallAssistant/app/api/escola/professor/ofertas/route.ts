import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ofertas = await prismaEdu.eduClassSubject.findMany({
    where: { networkId: ctx.networkId, teacherId: ctx.userId },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      class: { select: { id: true, name: true, gradeYear: true, shift: true, school: { select: { id: true, name: true } } } },
    },
    orderBy: { class: { name: "asc" } },
  });

  return NextResponse.json({ ofertas });
}
