import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const [skills, guides, tracks, diagnostics] = await Promise.all([
    prismaEdu.eduSkill.count({ where: { networkId: null } }),
    prismaEdu.eduSkillGuide.count({ where: { networkId: null } }),
    prismaEdu.eduTrack.count({ where: { networkId: null, source: "SPEAKFLOW" } }),
    prismaEdu.eduDiagnostic.count({ where: { networkId: null, source: "SPEAKFLOW" } }),
  ]);

  const bySubject = await prismaEdu.eduSkill.groupBy({
    by: ["subjectCode"],
    where: { networkId: null },
    _count: { id: true },
  });

  return NextResponse.json({
    totals: { skills, guides, tracks, diagnostics },
    bySubject: bySubject.map((r: { subjectCode: string; _count: { id: number } }) => ({ subjectCode: r.subjectCode, count: r._count.id })),
  });
}
