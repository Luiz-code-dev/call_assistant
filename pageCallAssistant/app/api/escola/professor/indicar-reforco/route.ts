/**
 * Professor indica reforço para a família (pacote de extensão de aula).
 * GET: turmas e matérias do professor, com os alunos, e os últimos envios (quantos leram e puseram na agenda).
 * POST {classSubjectId, todos, studentIds[], text}: cria uma indicação por aluno e avisa a família
 * no celular e por e-mail. A família vê no painel e pode pôr na agenda do filho.
 * O professor só envia para as turmas e matérias dele; coordenação e direção, para qualquer uma da rede.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { avisarFamilia } from "@/lib/escola/avisos-familia";
import {
  validarIndicacao, codigoAgendaDaMateria, nomeDoProfessor, avisoIndicacaoDoProfessor, MAX_ENVIOS_POR_DIA,
} from "@/lib/escola/professor-familia";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
export const dynamic = "force-dynamic";

const PAPEIS = ["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"];

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!PAPEIS.includes(ctx.role)) return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { ctx, P: (ctx.db ?? prismaEdu) as any };
}

/** Turmas e matérias que esta pessoa pode usar */
async function ofertas(P: any, ctx: { userId: string; networkId: string; role: string; schoolId: string | null }) {
  const where: any = { networkId: ctx.networkId, class: { isActive: true } };
  if (ctx.role === "TEACHER") where.teacherId = ctx.userId;
  else if (ctx.schoolId) where.class = { isActive: true, schoolId: ctx.schoolId };
  return P.eduClassSubject.findMany({
    where,
    select: {
      id: true, classId: true, teacherId: true,
      class: { select: { id: true, name: true, gradeYear: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ class: { gradeYear: "asc" } }, { class: { name: "asc" } }],
    take: 200,
  });
}

export async function GET() {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const lista: any[] = await ofertas(P, ctx!);
  const classIds = Array.from(new Set(lista.map((o) => o.classId)));
  const matriculas: any[] = classIds.length ? await P.eduEnrollment.findMany({
    where: { networkId: ctx!.networkId, classId: { in: classIds }, status: "ACTIVE" },
    select: { classId: true, student: { select: { id: true, fullName: true, isActive: true } } },
  }) : [];
  const alunosPorTurma = new Map<string, { id: string; nome: string }[]>();
  for (const m of matriculas) {
    if (!m.student?.isActive) continue;
    const l = alunosPorTurma.get(m.classId) ?? [];
    l.push({ id: m.student.id, nome: m.student.fullName });
    alunosPorTurma.set(m.classId, l);
  }
  alunosPorTurma.forEach((l) => l.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));

  const recentes: any[] = await P.eduReforcoIndicado.findMany({
    where: { networkId: ctx!.networkId, teacherUserId: ctx!.userId },
    orderBy: { createdAt: "desc" }, take: 300,
    select: { envioId: true, classId: true, studentId: true, subjectName: true, text: true, createdAt: true, readAt: true, agendaAt: true },
  });
  const nomes = new Map<string, string>();
  alunosPorTurma.forEach((l) => l.forEach((a) => nomes.set(a.id, a.nome)));
  const turmaNome = new Map<string, string>(lista.map((o) => [o.classId, o.class.name]));
  const envios = new Map<string, any>();
  for (const r of recentes) {
    const e = envios.get(r.envioId) ?? { id: r.envioId, turma: turmaNome.get(r.classId) ?? "Turma", materia: r.subjectName, texto: r.text, createdAt: r.createdAt, alunos: [] as string[], total: 0, lidos: 0, naAgenda: 0 };
    e.total++; if (r.readAt) e.lidos++; if (r.agendaAt) e.naAgenda++;
    if (e.alunos.length < 4) e.alunos.push((nomes.get(r.studentId) ?? "").split(" ")[0] || "Aluno");
    envios.set(r.envioId, e);
  }

  return NextResponse.json({
    ofertas: lista.map((o) => ({
      id: o.id, turma: o.class.name, ano: o.class.gradeYear, materia: o.subject.name,
      alunos: alunosPorTurma.get(o.classId) ?? [],
    })),
    envios: Array.from(envios.values()).slice(0, 20),
  });
}

export async function POST(req: Request) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const v = validarIndicacao(await req.json().catch(() => null));
  if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });

  const oferta = (await ofertas(P, ctx!)).find((o: any) => o.id === v.classSubjectId);
  if (!oferta) return NextResponse.json({ error: "Turma ou matéria não encontrada." }, { status: 404 });

  const desde = new Date(Date.now() - 86_400_000);
  const enviosHoje: any[] = await P.eduReforcoIndicado.findMany({
    where: { networkId: ctx!.networkId, teacherUserId: ctx!.userId, createdAt: { gte: desde } },
    distinct: ["envioId"], select: { envioId: true },
  });
  if (enviosHoje.length >= MAX_ENVIOS_POR_DIA) return NextResponse.json({ error: "Limite de avisos de hoje atingido." }, { status: 429 });

  const matriculas: any[] = await P.eduEnrollment.findMany({
    where: { networkId: ctx!.networkId, classId: oferta.classId, status: "ACTIVE" },
    select: { student: { select: { id: true, fullName: true, isActive: true } } },
  });
  const daTurma = matriculas.map((m) => m.student).filter((s: any) => s?.isActive);
  const alvo = v.todos ? daTurma : daTurma.filter((s: any) => v.studentIds.includes(s.id));
  if (!alvo.length) return NextResponse.json({ error: "Nenhum aluno desta turma foi escolhido." }, { status: 400 });

  const envioId = randomUUID();
  const materia = oferta.subject.name as string;
  const subjectCode = codigoAgendaDaMateria(materia);
  await P.eduReforcoIndicado.createMany({
    data: alvo.map((s: any) => ({
      networkId: ctx!.networkId, envioId, teacherUserId: ctx!.userId, classSubjectId: oferta.id, classId: oferta.classId,
      studentId: s.id, subjectName: materia, subjectCode, text: v.text,
    })),
  });

  // Quem assina é o professor da matéria; se quem enviou foi a coordenação, vai o nome de quem enviou
  const quem = await P.eduUser.findUnique({ where: { id: ctx!.userId }, select: { name: true } }).catch(() => null);
  const professor = nomeDoProfessor(quem?.name);
  const networkId = ctx!.networkId;
  let avisados = 0;
  for (const s of alvo) {
    avisados += await avisarFamilia(P, networkId, s.id, `INDICACAO:${envioId}`, avisoIndicacaoDoProfessor(s.fullName, materia, professor, v.text, s.id))
      .catch((err: Error) => { console.error("[professor/indicar-reforco] aviso:", err.message); return 0; });
  }

  return NextResponse.json({ ok: true, envioId, alunos: alvo.length, familiasAvisadas: avisados }, { status: 201 });
}
