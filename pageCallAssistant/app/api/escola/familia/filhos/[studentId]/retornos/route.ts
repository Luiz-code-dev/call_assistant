import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent } from "@/lib/escola/family-guard";

/* eslint-disable @typescript-eslint/no-explicit-any */

function relativeDay(d: Date | null): string {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} semana(s)`;
  return `há ${Math.floor(days / 30)} mês(es)`;
}

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await guardianOwnsStudent(ctx.guardianId, params.studentId))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const subs = await (prismaEdu as any).eduSubmission.findMany({
      where: { studentId: params.studentId, status: "EVALUATED", aiFeedback: { not: null } },
      orderBy: { evaluatedAt: "desc" }, take: 20,
      select: { evaluatedAt: true, aiFeedback: true, activity: { select: { classSubject: { select: { subjectId: true } } } } },
    });
    const subjIds = Array.from(new Set(subs.map((s: any) => s.activity?.classSubject?.subjectId).filter(Boolean)));
    const subjMap = new Map<string, string>();
    if (subjIds.length) {
      const ss = await (prismaEdu as any).eduSubject.findMany({ where: { id: { in: subjIds } }, select: { id: true, name: true } });
      for (const s of ss) subjMap.set(s.id, s.name);
    }
    const retornos = subs.map((s: any) => {
      const fb = (s.aiFeedback ?? {}) as any;
      return {
        subjectName: subjMap.get(s.activity?.classSubject?.subjectId) ?? "Componente",
        when: relativeDay(s.evaluatedAt),
        level: fb.level ?? fb.masteryLevel ?? null,
        acertou: fb.acertou ?? fb.gotRight ?? (Array.isArray(fb.strengths) ? fb.strengths[0] : null) ?? null,
        melhorar: fb.melhorar ?? fb.improve ?? (Array.isArray(fb.improvements) ? fb.improvements[0] : null) ?? null,
      };
    });
    return NextResponse.json({ retornos });
  } catch (err) {
    console.error("[familia/retornos:GET]", err);
    return NextResponse.json({ error: "Não foi possível carregar." }, { status: 500 });
  }
}
