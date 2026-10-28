import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { assignTrackToStudents } from "@/lib/escola/track-assignment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

const schema = z.object({
  classId:          z.string().optional(),
  studentIds:       z.array(z.string()).optional(),
  skillLevelFilter: z.array(z.enum(["NOT_YET","ALMOST"])).optional(),
  dueAt:            z.string().datetime().optional(),
  force:            z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER","COORDINATOR","NETWORK_ADMIN","SCHOOL_ADMIN"].includes(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const preview = sp.get("preview") === "1";

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { classId, studentIds, skillLevelFilter, dueAt, force } = parsed.data;
  if (!classId && (!studentIds || studentIds.length === 0)) {
    return NextResponse.json({ error: "Informe classId ou studentIds" }, { status: 400 });
  }

  // Professor só pode atribuir às suas turmas
  if (ctx.role === "TEACHER" && classId) {
    const offer = await p.eduClassSubject.findFirst({
      where: { classId, networkId: ctx.networkId, teacherId: ctx.userId },
    });
    if (!offer) return NextResponse.json({ error: "Turma não pertence a este professor" }, { status: 403 });
  }

  // Resolve lista de alunos
  let targetStudentIds: string[] = studentIds ?? [];
  if (classId && targetStudentIds.length === 0) {
    const enrollments = await p.eduEnrollment.findMany({
      where: { classId, networkId: ctx.networkId, isActive: true },
      select: { studentId: true },
    });
    targetStudentIds = enrollments.map((e: { studentId: string }) => e.studentId);
  }

  // Filtro por nível de domínio (NOT_YET / ALMOST)
  if (skillLevelFilter && skillLevelFilter.length > 0) {
    const track = await p.eduTrack.findUnique({ where: { id: params.id }, select: { skillIds: true } });
    if (track?.skillIds?.length > 0) {
      const masteries = await p.eduSkillMastery.findMany({
        where: { networkId: ctx.networkId, studentId: { in: targetStudentIds }, skillId: { in: track.skillIds } },
        select: { studentId: true, level: true },
      });
      const passMap: Record<string, boolean> = {};
      for (const m of masteries) {
        if (skillLevelFilter.includes(m.level as "NOT_YET" | "ALMOST")) passMap[m.studentId] = true;
      }
      targetStudentIds = targetStudentIds.filter((sid: string) => passMap[sid]);
    }
  }

  if (targetStudentIds.length === 0) {
    return NextResponse.json({ atribuidos: 0, pulados: [], aviso: "Nenhum aluno corresponde ao filtro" });
  }

  if (preview) {
    try {
      const result = await assignTrackToStudents({
        networkId: ctx.networkId,
        trackId: params.id,
        studentIds: targetStudentIds,
        assignedBy: ctx.userId,
        dueAt: dueAt ? new Date(dueAt) : null,
        force: force ?? false,
        dryRun: true,
      });
      return NextResponse.json({ preview: true, ...result });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  try {
    const result = await assignTrackToStudents({
      networkId: ctx.networkId,
      trackId: params.id,
      studentIds: targetStudentIds,
      assignedBy: ctx.userId,
      dueAt: dueAt ? new Date(dueAt) : null,
      force: force ?? false,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
