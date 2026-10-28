import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { db } from "@/lib/db";

function flag() { return isEscolasEnabled(); }

// Tradução de ações para português
const ACTION_PT: Record<string, string> = {
  "invite.sent": "Enviou um convite",
  "invite.accepted": "Aceitou um convite",
  "invite.cancelled": "Cancelou um convite",
  "invite.resent": "Reenvio de convite",
  "school.created": "Criou uma escola",
  "school.updated": "Atualizou uma escola",
  "class.created": "Criou uma turma",
  "class.updated": "Atualizou uma turma",
  "student.imported": "Importou alunos",
  "student.pin.reset": "Trocou o PIN de um aluno",
  "student.pins.generated": "Gerou senhas da turma",
  "student.card.revoked": "Bloqueou o cartão de um aluno",
  "student.unblocked": "Desbloqueou um aluno",
  "membership.created": "Vinculou um servidor",
  "membership.updated": "Atualizou vínculo de servidor",
  "membership.removed": "Desvinculou um servidor",
  "guardian.linked": "Vinculou um responsável a um aluno",
  "guardian.unlinked": "Desvinculou um responsável",
  "guardian.invited": "Enviou convite para responsável",
  "Assignments Updated": "Atualizou as atribuições de professores",
  "Guardian Linked": "Vinculou um responsável a um aluno",
  "Guardian Unlinked": "Desvinculou um responsável",
  "plan.approved": "Aprovou um plano de ensino",
  "trail.assigned": "Atribuiu uma trilha de reforço",
  "trail.created": "Criou uma trilha de reforço",
  "grade.enter": "Lançou notas",
  "network.created": "Criou uma rede",
  "network.updated": "Atualizou a rede",
};

// Tradução de entidades internas para nomes amigáveis
const ENTITY_PT: Record<string, string> = {
  "EduSchool": "Escola",
  "EduClass": "Turma",
  "EduStudent": "Aluno",
  "EduNetwork": "Rede",
  "EduInvite": "Convite",
  "EduMembership": "Servidor",
  "EduGuardianLink": "Vínculo familiar",
  "EduGuardian": "Responsável",
  "EduTeachingPlan": "Plano de ensino",
  "EduTrail": "Trilha",
  "EduAssessment": "Avaliação",
  "EduClass": "Turma",
};

// Tradução de perfil de ator
const ACTOR_ROLE_PT: Record<string, string> = {
  user: "Equipe",
  staff: "Equipe",
  student: "Aluno",
  guardian: "Família",
  system: "Sistema",
  NETWORK_ADMIN: "Gestor da rede",
  SCHOOL_ADMIN: "Direção",
  COORDINATOR: "Coordenação",
  TEACHER: "Professor(a)",
  PLATFORM_ADMIN: "Admin da plataforma",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaUser = db as any;

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","COORDINATOR","SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const actionFilter = searchParams.get("action");
  const pessoaFilter = searchParams.get("pessoa");

  const where: Record<string, unknown> = { networkId: ctx.networkId };
  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId) where["schoolId"] = ctx.schoolId;
  if (actionFilter) where["action"] = { contains: actionFilter, mode: "insensitive" };

  const logs = await prismaEdu.eduAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // Resolve nomes de atores em lote
  const userIds = [...new Set(logs.filter((l: { actorType: string }) => l.actorType === "user" || l.actorType === "staff").map((l: { actorId: string }) => l.actorId))];
  const studentIds = [...new Set(logs.filter((l: { actorType: string }) => l.actorType === "student").map((l: { actorId: string }) => l.actorId))];
  const guardianIds = [...new Set(logs.filter((l: { actorType: string }) => l.actorType === "guardian").map((l: { actorId: string }) => l.actorId))];

  const [users, students, guardians, memberships] = await Promise.all([
    userIds.length ? prismaUser.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [],
    studentIds.length ? prismaEdu.eduStudent.findMany({ where: { id: { in: studentIds as string[] } }, select: { id: true, fullName: true } }) : [],
    guardianIds.length ? prismaEdu.eduGuardian.findMany({ where: { id: { in: guardianIds as string[] } }, select: { id: true, name: true } }) : [],
    userIds.length ? prismaEdu.eduMembership.findMany({ where: { userId: { in: userIds as string[] }, networkId: ctx.networkId }, select: { userId: true, role: true } }) : [],
  ]);

  const userMap = Object.fromEntries(users.map((u: { id: string; name: string; email: string }) => [u.id, u.name || u.email || "Usuário"]));
  const studentMap = Object.fromEntries(students.map((s: { id: string; fullName: string }) => [s.id, s.fullName]));
  const guardianMap = Object.fromEntries(guardians.map((g: { id: string; name: string }) => [g.id, g.name]));
  const roleMap = Object.fromEntries(memberships.map((m: { userId: string; role: string }) => [m.userId, m.role]));

  // Resolve nomes de entidades (escolas, turmas, alunos)
  const entitySchoolIds = logs.filter((l: { entity: string }) => l.entity === "EduSchool").map((l: { entityId: string }) => l.entityId);
  const entityClassIds = logs.filter((l: { entity: string }) => l.entity === "EduClass").map((l: { entityId: string }) => l.entityId);
  const entityStudentIds = logs.filter((l: { entity: string }) => l.entity === "EduStudent").map((l: { entityId: string }) => l.entityId);

  const [entitySchools, entityClasses, entityStudentsDetail] = await Promise.all([
    entitySchoolIds.length ? prismaEdu.eduSchool.findMany({ where: { id: { in: entitySchoolIds } }, select: { id: true, name: true } }) : [],
    entityClassIds.length ? prismaEdu.eduClass.findMany({ where: { id: { in: entityClassIds } }, select: { id: true, name: true } }) : [],
    entityStudentIds.length ? prismaEdu.eduStudent.findMany({ where: { id: { in: entityStudentIds } }, select: { id: true, fullName: true } }) : [],
  ]);
  const eSchoolMap = Object.fromEntries(entitySchools.map((s: { id: string; name: string }) => [s.id, s.name]));
  const eClassMap = Object.fromEntries(entityClasses.map((c: { id: string; name: string }) => [c.id, c.name]));
  const eStudMap = Object.fromEntries(entityStudentsDetail.map((s: { id: string; fullName: string }) => [s.id, s.fullName]));

  type RawLog = { id: string; actorType: string; actorId: string; action: string; entity: string; entityId: string; createdAt: Date; ip: string | null };

  const enriched = logs.map((l: RawLog) => {
    let actorName = "Sistema";
    if (l.actorType === "user" || l.actorType === "staff") actorName = userMap[l.actorId] ?? "Usuário";
    else if (l.actorType === "student") actorName = studentMap[l.actorId] ?? "Aluno";
    else if (l.actorType === "guardian") actorName = guardianMap[l.actorId] ?? "Responsável";

    const actorRole = ACTOR_ROLE_PT[roleMap[l.actorId] ?? l.actorType] ?? "Equipe";

    let entityName = "";
    if (l.entity === "EduSchool") entityName = eSchoolMap[l.entityId] ?? "";
    else if (l.entity === "EduClass") entityName = eClassMap[l.entityId] ?? "";
    else if (l.entity === "EduStudent") entityName = eStudMap[l.entityId] ?? "";

    const actionPt = ACTION_PT[l.action] ?? l.action.replace(/[._]/g, " ");
    const entityPt = ENTITY_PT[l.entity] ?? l.entity;

    // Filtro por pessoa (nome resolvido)
    if (pessoaFilter && !actorName.toLowerCase().includes(pessoaFilter.toLowerCase())) return null;

    return {
      id: l.id,
      actorName,
      actorRole,
      action: actionPt,
      entityLabel: entityPt,
      entityName,
      ip: l.ip,
      createdAt: l.createdAt,
    };
  }).filter(Boolean);

  return NextResponse.json({ logs: enriched });
}
