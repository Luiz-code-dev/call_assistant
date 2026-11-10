/**
 * GET /api/escola/plataforma/redes/[id]/codigos-alunos
 * Lista dos alunos da rede com o código de cada um (planilha CSV), para entregar à escola.
 * A escola repassa o código à família (na matrícula ou na agenda do aluno).
 * Quem ainda não tem código ganha um agora.
 *
 * Acesso: administrador da plataforma.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { garantirCodigoAluno, formatarCodigo } from "@/lib/escola/codigo-aluno";
import { getTenant } from "@/lib/escola/catalogo";

function celula(v: unknown): string {
  const t = String(v ?? "");
  return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  if (!(await getTenant(id))) return NextResponse.json({ error: "Rede não encontrada" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await getTenantDb(id)) as any;

  const matriculas = await db.eduEnrollment.findMany({
    where: { networkId: id, status: "ACTIVE", student: { isActive: true } },
    include: {
      student: { select: { id: true, fullName: true, accessCode: true } },
      class: { select: { name: true, gradeYear: true, school: { select: { name: true } } } },
    },
  });

  const vistos = new Set<string>();
  const linhas: string[][] = [];
  for (const m of matriculas) {
    if (vistos.has(m.student.id)) continue;
    vistos.add(m.student.id);
    const codigo = m.student.accessCode ?? (await garantirCodigoAluno(db, m.student.id, id));
    linhas.push([m.class.school?.name ?? "", m.class.name, `${m.class.gradeYear}º ano`, m.student.fullName, formatarCodigo(codigo)]);
  }
  linhas.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[3].localeCompare(b[3]));

  const csv = "﻿" + [["Escola", "Turma", "Ano", "Aluno", "Código para entrar"], ...linhas]
    .map((l) => l.map(celula).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="codigos-dos-alunos.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
