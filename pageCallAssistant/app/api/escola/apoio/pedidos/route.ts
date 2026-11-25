/**
 * Canal de apoio, lado da equipe indicada pela secretaria.
 * GET -> lista dos pedidos (sem o texto: o conteúdo só vem ao abrir cada um, e a abertura fica registrada)
 */
import { NextResponse } from "next/server";
import { contextoDaEquipe } from "@/lib/escola/apoio-equipe";

export const runtime = "nodejs";

export async function GET() {
  const { ctx, P, erro } = await contextoDaEquipe();
  if (erro) return erro;
  const pedidos: any[] = await P.eduPedidoApoio.findMany({ // eslint-disable-line @typescript-eslint/no-explicit-any
    where: { networkId: ctx!.networkId },
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, studentId: true, classId: true, schoolId: true, assunto: true, status: true, audioKey: true, text: true, createdAt: true, vistoAt: true },
  });
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
      assunto: p.assunto, status: p.status, createdAt: p.createdAt, visto: !!p.vistoAt,
      temTexto: !!p.text, temAudio: !!p.audioKey,
    })),
  });
}
