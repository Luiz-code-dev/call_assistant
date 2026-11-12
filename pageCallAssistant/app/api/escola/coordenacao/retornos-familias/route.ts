/**
 * Retornos das famílias sobre os professores (pacote de extensão de aula), para a coordenação.
 * GET ?professor=&tipo=: os últimos 200, com professor, matéria, turma, responsável e aluno.
 * PATCH {id}: marca como lido.
 * Coordenação e gestor da rede veem a rede; quem está ligado a uma escola vê só a escola dele.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { ROTULO_RETORNO, TIPOS_RETORNO, type TipoRetorno } from "@/lib/escola/professor-familia";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
export const dynamic = "force-dynamic";

const PAPEIS = ["COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"];
const PARENTESCO: Record<string, string> = { MAE: "Mãe", PAI: "Pai", AVO_AVO: "Avó/Avô", TIO_TIA: "Tia/Tio", TUTOR_LEGAL: "Responsável legal", OUTRO: "Responsável" };

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!PAPEIS.includes(ctx.role)) return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { ctx, P: (ctx.db ?? prismaEdu) as any };
}

export async function GET(req: Request) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const u = new URL(req.url).searchParams;
  const where: any = { networkId: ctx!.networkId };
  if (ctx!.schoolId) where.schoolId = ctx!.schoolId;
  const professor = u.get("professor");
  if (professor) where.teacherUserId = professor;
  const tipo = (u.get("tipo") ?? "").toUpperCase();
  if ((TIPOS_RETORNO as readonly string[]).includes(tipo)) where.kind = tipo;

  const linhas: any[] = await P.eduRetornoFamilia.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const ids = (k: string) => Array.from(new Set(linhas.map((l) => l[k]).filter(Boolean)));
  const [usuarios, turmas, ofertas, responsaveis, alunos, vinculos] = await Promise.all([
    ids("teacherUserId").length ? P.eduUser.findMany({ where: { id: { in: ids("teacherUserId") } }, select: { id: true, name: true } }) : [],
    ids("classId").length ? P.eduClass.findMany({ where: { id: { in: ids("classId") } }, select: { id: true, name: true, school: { select: { name: true } } } }) : [],
    ids("classSubjectId").length ? P.eduClassSubject.findMany({ where: { id: { in: ids("classSubjectId") } }, select: { id: true, subject: { select: { name: true } } } }) : [],
    ids("guardianId").length ? P.eduGuardian.findMany({ where: { id: { in: ids("guardianId") } }, select: { id: true, name: true } }) : [],
    ids("studentId").length ? P.eduStudent.findMany({ where: { id: { in: ids("studentId") } }, select: { id: true, fullName: true } }) : [],
    ids("guardianId").length ? P.eduGuardianLink.findMany({ where: { guardianId: { in: ids("guardianId") } }, select: { guardianId: true, studentId: true, relation: true } }) : [],
  ]);
  const m = (l: any[]) => new Map(l.map((x) => [x.id, x]));
  const U = m(usuarios), T = m(turmas), O = m(ofertas), G = m(responsaveis), A = m(alunos);
  const rel = new Map((vinculos as any[]).map((v) => [`${v.guardianId}|${v.studentId}`, v.relation]));

  const retornos = linhas.map((l) => ({
    id: l.id,
    tipo: l.kind as TipoRetorno,
    tipoRotulo: ROTULO_RETORNO[l.kind as TipoRetorno] ?? l.kind,
    texto: l.text,
    createdAt: l.createdAt,
    lido: !!l.readAt,
    professorId: l.teacherUserId,
    professor: U.get(l.teacherUserId)?.name ?? "Professor(a)",
    materia: O.get(l.classSubjectId)?.subject?.name ?? "",
    turma: T.get(l.classId)?.name ?? "",
    escola: T.get(l.classId)?.school?.name ?? "",
    responsavel: G.get(l.guardianId)?.name ?? "Responsável",
    parentesco: PARENTESCO[rel.get(`${l.guardianId}|${l.studentId}`) ?? "OUTRO"] ?? "Responsável",
    aluno: A.get(l.studentId)?.fullName ?? "",
  }));

  const porProfessor = new Map<string, { id: string; nome: string; total: number; elogios: number; sugestoes: number; preocupacoes: number; naoLidos: number }>();
  for (const r of retornos) {
    const p = porProfessor.get(r.professorId) ?? { id: r.professorId, nome: r.professor, total: 0, elogios: 0, sugestoes: 0, preocupacoes: 0, naoLidos: 0 };
    p.total++;
    if (r.tipo === "ELOGIO") p.elogios++; else if (r.tipo === "SUGESTAO") p.sugestoes++; else p.preocupacoes++;
    if (!r.lido) p.naoLidos++;
    porProfessor.set(r.professorId, p);
  }

  return NextResponse.json({ retornos, professores: Array.from(porProfessor.values()).sort((a, b) => b.total - a.total) });
}

export async function PATCH(req: Request) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "Retorno não informado." }, { status: 400 });
  const where: any = { id: String(b.id), networkId: ctx!.networkId };
  if (ctx!.schoolId) where.schoolId = ctx!.schoolId;
  const r = await P.eduRetornoFamilia.updateMany({ where, data: { readAt: new Date(), readById: ctx!.userId } });
  if (!r.count) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
