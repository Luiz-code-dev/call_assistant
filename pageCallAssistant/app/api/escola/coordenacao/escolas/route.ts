/**
 * GET /api/escola/coordenacao/escolas
 * Retorna escolas e turmas da rede com participação na semana.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["COORDINATOR", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);
  since7d.setHours(0, 0, 0, 0);

  const schools = await prismaEdu.eduSchool.findMany({
    where: { networkId: ctx.networkId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // A escola não tem cidade própria no cadastro: vale a cidade da rede.
  const rede = await prismaEdu.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { city: true } }).catch(() => null);
  const cidadeDaRede: string = rede?.city ?? "";

  type EduSchoolRow = { id: string; name: string };
  type EduClassRow  = { id: string; name: string; gradeYear: number; shift: string };

  const escolas = await Promise.all((schools as EduSchoolRow[]).map(async (school) => {
    const turmasRaw = await prismaEdu.eduClass.findMany({
      where: { schoolId: school.id, networkId: ctx.networkId },
      select: { id: true, name: true, gradeYear: true, shift: true },
      orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
    });

    const turmas = await Promise.all((turmasRaw as EduClassRow[]).map(async (t) => {
      // Alunos ativos da turma e, entre eles, quantos entregaram alguma atividade na semana.
      // EduSubmission não tem relação com a matrícula: o vínculo é pelo aluno.
      const matriculas: { studentId: string }[] = await prismaEdu.eduEnrollment.findMany({
        where: { classId: t.id, networkId: ctx.networkId, status: "ACTIVE" },
        select: { studentId: true },
      }).catch(() => []);
      const alunoIds = matriculas.map((m) => m.studentId);
      const studentCount = alunoIds.length;

      const praticaram: { studentId: string }[] = alunoIds.length
        ? await prismaEdu.eduSubmission.findMany({
            where: { networkId: ctx.networkId, studentId: { in: alunoIds }, submittedAt: { gte: since7d } },
            select: { studentId: true },
            distinct: ["studentId"],
          }).catch(() => [])
        : [];
      const practiceCount = praticaram.length;

      const participationPct = studentCount > 0
        ? Math.min(100, Math.round((practiceCount / studentCount) * 100))
        : 0;

      return { id: t.id, name: t.name, gradeYear: t.gradeYear, shift: t.shift ?? "", studentCount, practiceCount, participationPct };
    }));

    return { id: school.id, name: school.name, city: cidadeDaRede, turmas };
  }));

  return NextResponse.json({ escolas });
}
