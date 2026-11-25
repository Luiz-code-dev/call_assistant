/**
 * Canal de apoio, lado da equipe indicada pela secretaria.
 * GET -> lista dos pedidos (sem o texto: o conteúdo só vem ao abrir cada um, e a abertura fica registrada)
 */
import { NextResponse } from "next/server";
import { contextoDaEquipe } from "@/lib/escola/apoio-equipe";

export const runtime = "nodejs";

export async function GET() {
  const { P, filtro, erro } = await contextoDaEquipe();
  if (erro) return erro;
  // Pedidos ainda em aberto nunca somem da tela por causa de pedidos mais novos:
  // vêm todos os não concluídos e, à parte, os concluídos mais recentes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [abertos, concluidos]: any[][] = await Promise.all([
    P.eduPedidoApoio.findMany({
      where: { ...filtro, status: { not: "CONCLUIDO" } }, orderBy: { createdAt: "desc" }, take: 2000,
      select: { id: true, studentId: true, classId: true, schoolId: true, assunto: true, status: true, desfecho: true, comunicadoA: true, audioKey: true, text: true, createdAt: true, vistoAt: true },
    }),
    P.eduPedidoApoio.findMany({
      where: { ...filtro, status: "CONCLUIDO" }, orderBy: { createdAt: "desc" }, take: 200,
      select: { id: true, studentId: true, classId: true, schoolId: true, assunto: true, status: true, desfecho: true, comunicadoA: true, audioKey: true, text: true, createdAt: true, vistoAt: true },
    }),
  ]);
  const pedidos = [...abertos, ...concluidos];
  const ids = (campo: string) => Array.from(new Set(pedidos.map((p) => p[campo]).filter(Boolean)));
  const [alunos, turmas, escolas] = await Promise.all([
    P.eduStudent.findMany({ where: { id: { in: ids("studentId") } }, select: { id: true, fullName: true } }),
    P.eduClass.findMany({ where: { id: { in: ids("classId") } }, select: { id: true, name: true } }),
    P.eduSchool.findMany({ where: { id: { in: ids("schoolId") } }, select: { id: true, name: true } }),
  ]);
  const nome = (lista: { id: string; fullName?: string; name?: string }[]) => new Map(lista.map((x) => [x.id, x.fullName ?? x.name ?? ""]));
  const aluno = nome(alunos), turma = nome(turmas), escola = nome(escolas);
  return NextResponse.json({
    pedidos: pedidos.map((p) => ({
      id: p.id, aluno: aluno.get(p.studentId) ?? "Aluno", turma: turma.get(p.classId) ?? "", escola: escola.get(p.schoolId) ?? "",
      assunto: p.assunto, status: p.status, desfecho: p.desfecho, comunicado: (p.comunicadoA ?? []).length > 0, createdAt: p.createdAt, visto: !!p.vistoAt,
      temTexto: !!p.text, temAudio: !!p.audioKey,
    })),
  });
}
