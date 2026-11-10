/**
 * POST /api/escola/familia/codigo  { codigo }
 * Confere o código da ficha de acesso antes do cadastro do responsável.
 * Devolve o nome PARCIAL do aluno (ex.: "B** S*****"), a turma e a escola, para a
 * pessoa confirmar "é o meu filho". Nunca lista alunos nem busca por nome.
 */
import { NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { acharCodigoFamilia, bloqueado, nomeParcial } from "@/lib/escola/codigo-familia";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { codigo } = (await req.json().catch(() => ({}))) as { codigo?: string };
  const achado = await acharCodigoFamilia(String(codigo ?? ""));
  if (!achado) return NextResponse.json({ error: "Não achamos esse código. Confira na ficha ou peça uma nova à escola." }, { status: 404 });
  const minutos = bloqueado(achado.record);
  if (minutos) return NextResponse.json({ error: `Este código está bloqueado por segurança. Tente de novo em ${minutos} minutos.` }, { status: 429 });
  const enr = await achado.db.eduEnrollment.findFirst({
    where: { studentId: achado.student.id, status: "ACTIVE" }, orderBy: { startedAt: "desc" },
    include: { class: { select: { name: true, school: { select: { name: true } } } } },
  });
  return NextResponse.json({
    aluno: nomeParcial(achado.student.fullName),
    turma: enr?.class?.name ?? null,
    escola: enr?.class?.school?.name ?? null,
    temDataNascimento: !!achado.student.birthDate,
  });
}
