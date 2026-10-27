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

    // ── Esta semana ── (segunda..domingo, America/Sao_Paulo; exclui IN_PROGRESS)
    const weekStart = weekStartSaoPaulo();
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const subsWeek = await (prismaEdu as any).eduSubmission.findMany({
      where: { studentId, submittedAt: { gte: weekStart, lt: weekEnd }, status: { not: "IN_PROGRESS" } },
      select: { submittedAt: true, activityId: true },
    });
    const dias = [false, false, false, false, false, false, false];
    const actIds = new Set<string>();
    for (const s of subsWeek) { if (s.submittedAt) dias[dayIndexSaoPaulo(new Date(s.submittedAt))] = true; actIds.add(s.activityId); }
    const atividades = actIds.size;
    // minutos = soma de EduTrackItem.estMinutes por activityId (10 se nao houver)
    let minutos = 0;
    if (actIds.size) {
      const items = await (prismaEdu as any).eduTrackItem.findMany({ where: { activityId: { in: Array.from(actIds) } }, select: { activityId: true, estMinutes: true } });
      const est = new Map<string, number>(items.map((i: any) => [i.activityId, i.estMinutes]));
      for (const id of Array.from(actIds)) minutos += est.get(id) ?? 10;
    }
    const diasPraticados = dias.filter(Boolean).length;
    let semanaFrase: string;
    if (diasPraticados === 0) semanaFrase = `${firstName} ainda não praticou esta semana.`;
    else if (diasPraticados < 3) semanaFrase = `${firstName} praticou ${diasPraticados} dia(s) esta semana.`;
    else semanaFrase = `${firstName} praticou ${diasPraticados} dias esta semana. Muito bem!`;

    // ── Trilhas ── (atribuicao por aluno OU pela turma ativa; so track APPROVED)
    const assigns = await (prismaEdu as any).eduTrackAssignment.findMany({
      where: { OR: [{ studentId }, ...(enr?.classId ? [{ classId: enr.classId }] : [])] },
      include: {
        track: { select: { id: true, title: true, subjectId: true, skillIds: true, status: true, _count: { select: { items: true } } } },
        progress: { where: { studentId }, select: { completedItemIds: true, lastActivityAt: true } },
      },
    });
    // Ativas = track APPROVED e feitas < total; atual = lastActivityAt mais recente (senao startsAt)
    const ativas = assigns
      .filter((a: any) => a.track?.status === "APPROVED")
      .map((a: any) => ({ a, feitas: a.progress[0]?.completedItemIds?.length ?? 0, total: a.track._count?.items ?? 0, last: a.progress[0]?.lastActivityAt ?? null }))
      .filter((x: any) => x.feitas < x.total)
      .sort((x: any, y: any) => {
        const lx = x.last ? new Date(x.last).getTime() : 0, ly = y.last ? new Date(y.last).getTime() : 0;
        if (ly !== lx) return ly - lx;
        return new Date(y.a.startsAt).getTime() - new Date(x.a.startsAt).getTime();
      });
    let trilhaAtual: any = null;
    if (ativas.length) {
      const { a, feitas, total } = ativas[0];
      const subject = await (prismaEdu as any).eduSubject.findUnique({ where: { id: a.track.subjectId }, select: { name: true, color: true } });
      let skillLabel = a.track.title;
      if (a.track.skillIds?.length) {
        const sk = await (prismaEdu as any).eduSkill.findFirst({ where: { id: { in: a.track.skillIds } }, select: { shortLabel: true, description: true } });
        skillLabel = sk?.shortLabel || sk?.description || a.track.title;
      }
      trilhaAtual = { subjectName: subject?.name ?? "Componente", subjectColor: subject?.color ?? "#6D28D9", skillLabel, feitas, total };
    }
    const outrasTrilhas = Math.max(0, ativas.length - 1);

    // ── Evolução ──
    const masteries = await (prismaEdu as any).eduSkillMastery.findMany({ where: { studentId }, select: { level: true } });
    const evolucao = { MASTERED: 0, ALMOST: 0, NOT_YET: 0, avancaramNoMes: 0 };
    for (const m of masteries) evolucao[m.level as "MASTERED" | "ALMOST" | "NOT_YET"]++;
    // avancaramNoMes = habilidades com evento nos ultimos 30d cujo nivel ficou
    // melhor que o evento anterior da mesma habilidade.
    const since = new Date(Date.now() - 30 * 86400000);
    const RANK: Record<string, number> = { NOT_YET: 0, ALMOST: 1, MASTERED: 2 };
    const allEvents = await (prismaEdu as any).eduSkillMasteryEvent.findMany({
      where: { studentId }, orderBy: { createdAt: "asc" }, select: { skillId: true, level: true, createdAt: true },
    });
    const prevBySkill = new Map<string, number>();
    const avancou = new Set<string>();
    for (const e of allEvents) {
      const prev = prevBySkill.get(e.skillId);
      const cur = RANK[e.level] ?? 0;
      if (prev !== undefined && cur > prev && new Date(e.createdAt) >= since) avancou.add(e.skillId);
      prevBySkill.set(e.skillId, cur);
    }
    evolucao.avancaramNoMes = avancou.size;

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

    // ── Últimos retornos ── (aiStatus DONE; nivel da coluna masteryLevel)
    const subs = await (prismaEdu as any).eduSubmission.findMany({
      where: { studentId, aiStatus: "DONE" },
      orderBy: { evaluatedAt: "desc" }, take: 3,
      select: { evaluatedAt: true, aiFeedback: true, masteryLevel: true, activity: { select: { title: true, classSubject: { select: { subjectId: true } } } } },
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
        title: s.activity?.title ?? null,
        when: relativeDay(s.evaluatedAt),
        level: s.masteryLevel ?? null,
        acertou: Array.isArray(fb.acertos) ? fb.acertos[0] ?? null : null,
        melhorar: Array.isArray(fb.melhorar) ? fb.melhorar[0] ?? null : null,
      };
    });

    // ── Alertas ──
    const alertas: { tipo: "warn" | "info"; texto: string }[] = [];
    const lastSub = await (prismaEdu as any).eduSubmission.findFirst({ where: { studentId, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } });
    if (lastSub?.submittedAt) {
      const d = Math.floor((Date.now() - new Date(lastSub.submittedAt).getTime()) / 86400000);
      if (d >= 7) alertas.push({ tipo: "warn", texto: `${firstName} está há ${d} dias sem praticar.` });
    } else if (trilhaAtual) {
      alertas.push({ tipo: "warn", texto: `${firstName} ainda não começou a praticar.` });
    }
    // Novo diagnostico disponivel = EduDiagnostic OPEN do ano da turma, na janela,
    // sem entrega do aluno em nenhuma atividade dos seus itens.
    if (cls?.gradeYear != null) {
      const now = new Date();
      const diag = await (prismaEdu as any).eduDiagnostic.findFirst({
        where: {
          networkId: ctx.networkId, gradeYear: cls.gradeYear, status: "OPEN",
          OR: [{ opensAt: null }, { opensAt: { lte: now } }],
          AND: [{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] }],
        },
        select: { id: true, items: { select: { activityId: true } } },
      });
      if (diag) {
        const diagActs = diag.items.map((i: any) => i.activityId).filter(Boolean);
        const done = diagActs.length
          ? await (prismaEdu as any).eduSubmission.count({ where: { studentId, activityId: { in: diagActs }, status: { not: "IN_PROGRESS" } } })
          : 0;
        if (done === 0) alertas.push({ tipo: "info", texto: `Novo diagnóstico disponível para ${firstName}.` });
      }
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
