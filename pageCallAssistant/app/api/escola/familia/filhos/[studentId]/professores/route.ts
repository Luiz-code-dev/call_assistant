/**
 * Professores do filho (pacote de extensão de aula), no painel da família.
 * GET: reforços indicados pelos professores (marca como lidos), os professores da turma
 *      e os últimos retornos que este responsável mandou.
 * POST {acao:"agenda", indicacaoId, weekdays[], time, minutes}: põe o reforço indicado na agenda do filho.
 * POST {acao:"retorno", classSubjectId, kind, text}: manda um retorno sobre o professor para a coordenação.
 * Só para os próprios filhos (outro aluno dá 404). Sem professores na turma, as listas vêm vazias.
 */
import { NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent } from "@/lib/escola/family-guard";
import { validarAgenda } from "@/lib/escola/recados";
import { validarRetorno, nomeDoProfessor, MAX_RETORNOS_POR_DIA } from "@/lib/escola/professor-familia";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
export const dynamic = "force-dynamic";
const MAX_ITENS_AGENDA = 21;

async function contexto(studentId: string) {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getFamilyContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!(await guardianOwnsStudent(ctx.guardianId, studentId))) {
    return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  }
  return { ctx, P: ctx.db as any };
}

/** Turma atual do filho e os professores atribuídos às matérias dela */
async function professoresDaTurma(P: any, networkId: string, studentId: string) {
  const mat = await P.eduEnrollment.findFirst({
    where: { networkId, studentId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    select: { classId: true, class: { select: { schoolId: true } } },
  });
  if (!mat) return { turma: null as null | { classId: string; schoolId: string }, professores: [] as any[] };
  const ofertas: any[] = await P.eduClassSubject.findMany({
    where: { networkId, classId: mat.classId, teacherId: { not: null } },
    select: { id: true, teacherId: true, subject: { select: { name: true } } },
  });
  const ids = Array.from(new Set(ofertas.map((o) => o.teacherId)));
  const usuarios: any[] = ids.length ? await P.eduUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nome = new Map(usuarios.map((u) => [u.id, u.name]));
  return {
    turma: { classId: mat.classId as string, schoolId: mat.class.schoolId as string },
    professores: ofertas
      .map((o) => ({ classSubjectId: o.id, teacherUserId: o.teacherId, professor: nomeDoProfessor(nome.get(o.teacherId)), materia: o.subject.name }))
      .sort((a, b) => a.materia.localeCompare(b.materia, "pt-BR")),
  };
}

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, P, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const networkId = ctx!.networkId;
  const [{ professores }, indicacoes, retornos] = await Promise.all([
    professoresDaTurma(P, networkId, params.studentId),
    P.eduReforcoIndicado.findMany({
      where: { networkId, studentId: params.studentId },
      orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, teacherUserId: true, subjectName: true, subjectCode: true, text: true, createdAt: true, readAt: true, agendaAt: true },
    }),
    P.eduRetornoFamilia.findMany({
      where: { networkId, guardianId: ctx!.guardianId, studentId: params.studentId },
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, classSubjectId: true, kind: true, text: true, createdAt: true, readAt: true },
    }),
  ]);
  const ids = Array.from(new Set((indicacoes as any[]).map((i) => i.teacherUserId)));
  const usuarios: any[] = ids.length ? await P.eduUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nome = new Map(usuarios.map((u) => [u.id, u.name]));
  const naoLidas = (indicacoes as any[]).filter((i) => !i.readAt).map((i) => i.id);
  if (naoLidas.length) {
    await P.eduReforcoIndicado.updateMany({ where: { id: { in: naoLidas }, networkId }, data: { readAt: new Date() } }).catch(() => null);
  }
  const materiaDe = new Map(professores.map((p: any) => [p.classSubjectId, `${p.professor} · ${p.materia}`]));
  return NextResponse.json({
    indicacoes: (indicacoes as any[]).map((i) => ({
      id: i.id, professor: nomeDoProfessor(nome.get(i.teacherUserId)), materia: i.subjectName, subjectCode: i.subjectCode,
      texto: i.text, createdAt: i.createdAt, nova: !i.readAt, naAgenda: !!i.agendaAt,
    })),
    professores: professores.map((p: any) => ({ classSubjectId: p.classSubjectId, professor: p.professor, materia: p.materia })),
    retornos: (retornos as any[]).map((r) => ({ id: r.id, sobre: materiaDe.get(r.classSubjectId) ?? "Professor(a)", kind: r.kind, texto: r.text, createdAt: r.createdAt, lido: !!r.readAt })),
  });
}

export async function POST(req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, P, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const networkId = ctx!.networkId;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.acao === "agenda") {
    const ind = await P.eduReforcoIndicado.findFirst({
      where: { id: String(body.indicacaoId ?? ""), networkId, studentId: params.studentId },
      select: { id: true, subjectCode: true },
    });
    if (!ind) return NextResponse.json({ error: "Indicação não encontrada." }, { status: 404 });
    const v = validarAgenda({ ...body, subjectCode: ind.subjectCode });
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const ativos: Array<{ weekday: number; time: string }> = await P.eduStudyPlanItem.findMany({
      where: { networkId, studentId: params.studentId, isActive: true }, select: { weekday: true, time: true },
    });
    const novos = v.weekdays.filter((d) => !ativos.some((a) => a.weekday === d && a.time === v.time));
    if (!novos.length) return NextResponse.json({ error: "Esse horário já está na agenda nesses dias." }, { status: 409 });
    if (ativos.length + novos.length > MAX_ITENS_AGENDA) return NextResponse.json({ error: "A agenda já está cheia." }, { status: 400 });
    for (const weekday of novos) {
      await P.eduStudyPlanItem.create({
        data: { networkId, guardianId: ctx!.guardianId, studentId: params.studentId, weekday, time: v.time, subjectCode: v.subjectCode, minutes: v.minutes },
      });
    }
    await P.eduReforcoIndicado.update({ where: { id: ind.id }, data: { agendaAt: new Date(), readAt: new Date() } });
    return NextResponse.json({ ok: true, dias: novos.length }, { status: 201 });
  }

  if (body?.acao === "retorno") {
    const v = validarRetorno(body);
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { turma, professores } = await professoresDaTurma(P, networkId, params.studentId);
    const prof = professores.find((p: any) => p.classSubjectId === v.classSubjectId);
    if (!turma || !prof) return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
    const desde = new Date(Date.now() - 86_400_000);
    const hoje = await P.eduRetornoFamilia.count({ where: { networkId, guardianId: ctx!.guardianId, createdAt: { gte: desde } } });
    if (hoje >= MAX_RETORNOS_POR_DIA) return NextResponse.json({ error: "Limite de retornos de hoje atingido." }, { status: 429 });
    await P.eduRetornoFamilia.create({
      data: {
        networkId, guardianId: ctx!.guardianId, studentId: params.studentId, classId: turma.classId, schoolId: turma.schoolId,
        classSubjectId: prof.classSubjectId, teacherUserId: prof.teacherUserId, kind: v.kind, text: v.text,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
