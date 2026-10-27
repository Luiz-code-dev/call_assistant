import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent, weekStartSaoPaulo, dayIndexSaoPaulo } from "@/lib/escola/family-guard";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SHIFT_LABEL: Record<string, string> = { MORNING: "Manhã", AFTERNOON: "Tarde", EVENING: "Noite", FULL: "Integral" };

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
    const studentId = params.studentId;
    const student = await (prismaEdu as any).eduStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true, fullName: true,
        enrollments: {
          where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1,
          select: { classId: true, class: { select: { name: true, shift: true, gradeYear: true, school: { select: { name: true, phone: true, email: true } } } } },
        },
      },
    });
    if (!student) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const firstName = student.fullName.trim().split(/\s+/)[0];
    const enr = student.enrollments[0];
    const cls = enr?.class;

    // ── Esta semana ──
    const weekStart = weekStartSaoPaulo();
    const subsWeek = await (prismaEdu as any).eduSubmission.findMany({
      where: { studentId, submittedAt: { gte: weekStart }, status: { in: ["SUBMITTED", "EVALUATED"] } },
      select: { submittedAt: true },
    });
    const dias = [false, false, false, false, false, false, false];
    for (const s of subsWeek) if (s.submittedAt) dias[dayIndexSaoPaulo(new Date(s.submittedAt))] = true;
    const atividades = subsWeek.length;
    const minutos = atividades * 10; // aprox. (estMinutes padrao); refinar ao mapear item da trilha
    const diasPraticados = dias.filter(Boolean).length;
    let semanaFrase: string;
    if (diasPraticados === 0) semanaFrase = `${firstName} ainda não praticou esta semana.`;
    else if (diasPraticados < 3) semanaFrase = `${firstName} praticou ${diasPraticados} dia(s) esta semana.`;
    else semanaFrase = `${firstName} praticou ${diasPraticados} dias esta semana. Muito bem!`;

    // ── Trilhas ──
    const assigns = await (prismaEdu as any).eduTrackAssignment.findMany({
      where: { OR: [{ studentId }, ...(enr?.classId ? [{ classId: enr.classId }] : [])] },
      orderBy: { startsAt: "desc" },
      include: { track: { select: { id: true, title: true, subjectId: true, skillIds: true } }, progress: { where: { studentId }, select: { completedItemIds: true } } },
    });
    let trilhaAtual: any = null;
    if (assigns.length) {
      const a = assigns[0];
      const total = await (prismaEdu as any).eduTrackItem.count({ where: { trackId: a.track.id } });
      const feitas = a.progress[0]?.completedItemIds?.length ?? 0;
      const subject = await (prismaEdu as any).eduSubject.findUnique({ where: { id: a.track.subjectId }, select: { name: true, color: true } });
      let skillLabel = a.track.title;
      if (a.track.skillIds?.length) {
        const sk = await (prismaEdu as any).eduSkill.findFirst({ where: { id: { in: a.track.skillIds } }, select: { shortLabel: true, description: true } });
        skillLabel = sk?.shortLabel || sk?.description || a.track.title;
      }
      trilhaAtual = { subjectName: subject?.name ?? "Componente", subjectColor: subject?.color ?? "#6D28D9", skillLabel, feitas, total };
    }
    const outrasTrilhas = Math.max(0, assigns.length - 1);

    // ── Evolução ──
    const masteries = await (prismaEdu as any).eduSkillMastery.findMany({ where: { studentId }, select: { level: true } });
    const evolucao = { MASTERED: 0, ALMOST: 0, NOT_YET: 0, avancaramNoMes: 0 };
    for (const m of masteries) evolucao[m.level as "MASTERED" | "ALMOST" | "NOT_YET"]++;
    const since = new Date(Date.now() - 30 * 86400000);
    evolucao.avancaramNoMes = await (prismaEdu as any).eduSkillMasteryEvent.count({
      where: { studentId, createdAt: { gte: since }, level: { in: ["ALMOST", "MASTERED"] } },
    });

    // ── Dica "Como ajudar" (1x por semana, reaproveitada) ──
    let dica = "Pergunte o que ele(a) aprendeu hoje e peça para explicar com as próprias palavras.";
    const tip = await (prismaEdu as any).eduFamilyTip.findUnique({ where: { studentId_weekStart: { studentId, weekStart } } });
    if (tip) dica = tip.text;
    else {
      // Habilidade em que mais precisa (nivel mais baixo). Payload sem nome/matricula.
      const lowest = await (prismaEdu as any).eduSkillMastery.findFirst({
        where: { studentId, level: { in: ["NOT_YET", "ALMOST"] } },
        orderBy: [{ level: "asc" }, { updatedAt: "asc" }],
        include: { skill: { select: { id: true, shortLabel: true, description: true } } },
      });
      if (lowest?.skill) {
        const hab = lowest.skill.shortLabel || lowest.skill.description;
        dica = `Converse sobre "${hab}" no dia a dia e peça para ${firstName} explicar com um exemplo prático.`;
        await (prismaEdu as any).eduFamilyTip.create({
          data: { networkId: ctx.networkId, studentId, skillId: lowest.skill.id, weekStart, text: dica },
        }).catch(() => {});
      }
    }

    // ── Últimos retornos ──
    const subs = await (prismaEdu as any).eduSubmission.findMany({
      where: { studentId, status: "EVALUATED", aiFeedback: { not: null } },
      orderBy: { evaluatedAt: "desc" }, take: 3,
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

    // ── Alertas ──
    const alertas: { tipo: "warn" | "info"; texto: string }[] = [];
    const lastSub = await (prismaEdu as any).eduSubmission.findFirst({ where: { studentId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } });
    if (lastSub?.submittedAt) {
      const d = Math.floor((Date.now() - new Date(lastSub.submittedAt).getTime()) / 86400000);
      if (d >= 7) alertas.push({ tipo: "warn", texto: `${firstName} está há ${d} dias sem praticar.` });
    }

    return NextResponse.json({
      aluno: { id: student.id, fullName: student.fullName, firstName, className: cls?.name ?? null, schoolName: cls?.school?.name ?? null, shift: cls ? (SHIFT_LABEL[cls.shift] ?? cls.shift) : null, gradeYear: cls?.gradeYear ?? null },
      semana: { dias, atividades, minutos, frase: semanaFrase, hojeIndex: dayIndexSaoPaulo(new Date()) },
      trilhaAtual, outrasTrilhas,
      evolucao,
      dica,
      retornos,
      alertas,
      escola: { nome: cls?.school?.name ?? null, turma: cls?.name ?? null, turno: cls ? (SHIFT_LABEL[cls.shift] ?? cls.shift) : null, phone: cls?.school?.phone ?? null, email: cls?.school?.email ?? null },
    });
  } catch (err) {
    console.error("[familia/resumo:GET]", err);
    return NextResponse.json({ error: "Não foi possível carregar." }, { status: 500 });
  }
}
