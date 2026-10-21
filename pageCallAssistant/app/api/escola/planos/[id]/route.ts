import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const plan = await prismaEdu.eduTeachingPlan.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
    include: {
      subject: { select: { name: true, color: true } },
      schoolYear: { select: { year: true } },
      units: { orderBy: { order: "asc" } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  return NextResponse.json({ plan });
}
