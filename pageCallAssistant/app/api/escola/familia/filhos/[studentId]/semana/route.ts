/**
 * GET /api/escola/familia/filhos/[studentId]/semana
 * Os últimos 7 dias do filho: quanto estudou em cada dia e como foi em cada matéria.
 * Só palavras e contagens, sem nota.
 */
import { NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { subjectInfo } from "@/lib/escola/subjects";
import { montarSemana, type Nivel } from "@/lib/escola/semana-filho";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const db = ctx.db;
  const link = await db.eduGuardianLink.findFirst({ where: { guardianId: ctx.guardianId, studentId: params.studentId, isActive: true }, select: { id: true } });
  if (!link) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const aluno = await db.eduStudent.findUnique({ where: { id: params.studentId }, select: { fullName: true } });
  const desde = new Date(Date.now() - 8 * 86_400_000);
  const subs: Array<{ submittedAt: Date; masteryLevel: Nivel | null; activityId: string; activity: { subjectCode: string | null } }> =
    await db.eduSubmission.findMany({
      where: { studentId: params.studentId, submittedAt: { gte: desde }, status: { not: "IN_PROGRESS" } },
      select: { submittedAt: true, masteryLevel: true, activityId: true, activity: { select: { subjectCode: true } } },
    });
  const ids = Array.from(new Set(subs.map((s) => s.activityId)));
  const itens: Array<{ activityId: string; estMinutes: number }> = ids.length
    ? await db.eduTrackItem.findMany({ where: { activityId: { in: ids } }, select: { activityId: true, estMinutes: true } })
    : [];
  const minutos = new Map(itens.map((i) => [i.activityId, i.estMinutes]));

  const semana = montarSemana(
    subs.map((s) => ({ quando: new Date(s.submittedAt), materia: s.activity?.subjectCode ?? null, nivel: s.masteryLevel, minutos: minutos.get(s.activityId) ?? 10 })),
    (aluno?.fullName ?? "").trim().split(/\s+/)[0] || "Seu filho",
    (c) => subjectInfo(c).name,
  );
  return NextResponse.json({
    ...semana,
    materias: semana.materias.map((m) => ({ ...m, nome: subjectInfo(m.codigo).name })),
  });
}
