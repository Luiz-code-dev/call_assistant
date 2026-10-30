import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

const ALLOWED_ROLES = ["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"];

export async function GET(_req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const student = await prismaEdu.eduStudent.findFirst({
    where: { id: params.studentId, networkId: ctx.networkId },
    select: { id: true, fullName: true, enrollmentCode: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const masteries = await prismaEdu.eduSkillMastery.findMany({
    where: { networkId: ctx.networkId, studentId: params.studentId },
    include: {
      skill: {
        select: { id: true, code: true, subjectCode: true, description: true, shortLabel: true, thematicUnit: true, knowledgeObject: true },
      },
    },
    orderBy: { skill: { subjectCode: "asc" } },
  });

  const events = await prismaEdu.eduSkillMasteryEvent.findMany({
    where: { networkId: ctx.networkId, studentId: params.studentId },
    include: { skill: { select: { code: true, subjectCode: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Erros comuns mais frequentes por habilidade
  const guides = await prismaEdu.eduSkillGuide.findMany({
    where: {
      networkId: null,
      skillId: { in: masteries.map((m: { skillId: string }) => m.skillId) },
      status: "APPROVED",
    },
    select: { skillId: true, commonErrors: true },
  });
  const guideMap = Object.fromEntries(guides.map((g: { skillId: string; commonErrors: unknown }) => [g.skillId, g.commonErrors]));

  return NextResponse.json({ student, masteries, events: events.slice(0, 20), guideMap });
}
