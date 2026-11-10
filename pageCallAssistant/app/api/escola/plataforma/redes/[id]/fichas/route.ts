/**
 * Fichas de acesso do reforço (para imprimir e a escola entregar às famílias).
 * GET: turmas da rede com quantos alunos.
 * POST { turmaId }: gera um código de família NOVO para cada aluno da turma e devolve
 *   as fichas: aluno, turma, escola, código do aluno, código e link (QR) da família.
 *   O código de família anterior deixa de valer; quem já se cadastrou continua ligado.
 *
 * Acesso: administrador da plataforma.
 */
import { NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { getTenant } from "@/lib/escola/catalogo";
import { garantirCodigoAluno, formatarCodigo } from "@/lib/escola/codigo-aluno";
import { gerarCodigoFamilia } from "@/lib/escola/codigo-familia";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function acesso(id: string) {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (ctx.role !== "PLATFORM_ADMIN") return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (!(await getTenant(id))) return { erro: NextResponse.json({ error: "Rede não encontrada" }, { status: 404 }) };
  return { db: (await getTenantDb(id)) as any };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await acesso(id);
  if (a.erro) return a.erro;
  const turmas = await a.db.eduClass.findMany({
    where: { networkId: id, isActive: true },
    select: { id: true, name: true, gradeYear: true, school: { select: { name: true } }, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    turmas: turmas.map((t: any) => ({ id: t.id, nome: t.name, ano: t.gradeYear, escola: t.school?.name ?? "", alunos: t._count.enrollments })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await acesso(id);
  if (a.erro) return a.erro;
  const { turmaId } = (await req.json().catch(() => ({}))) as { turmaId?: string };
  if (!turmaId) return NextResponse.json({ error: "Escolha a turma." }, { status: 400 });
  const turma = await a.db.eduClass.findFirst({ where: { id: turmaId, networkId: id }, select: { name: true, gradeYear: true, school: { select: { name: true } } } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const matriculas = await a.db.eduEnrollment.findMany({
    where: { networkId: id, classId: turmaId, status: "ACTIVE", student: { isActive: true } },
    include: { student: { select: { id: true, fullName: true, birthDate: true } } },
  });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const fichas: any[] = [];
  for (const m of matriculas.sort((x: any, y: any) => x.student.fullName.localeCompare(y.student.fullName))) {
    const codigoAluno = await garantirCodigoAluno(a.db, m.student.id, id);
    const { codigo, expiresAt } = await gerarCodigoFamilia(a.db, id, m.student.id);
    fichas.push({
      aluno: m.student.fullName,
      semDataNascimento: !m.student.birthDate,
      codigoAluno: formatarCodigo(codigoAluno),
      codigoFamilia: `${codigo.slice(0, 4)}-${codigo.slice(4)}`,
      linkFamilia: `${base}/escola/familia/primeiro-acesso?codigo=${codigo}`,
      validade: expiresAt,
    });
  }
  return NextResponse.json({ turma: turma.name, ano: turma.gradeYear, escola: turma.school?.name ?? "", entrarAluno: `${base}/escola/aluno/entrar`, fichas });
}
