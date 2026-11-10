/**
 * POST /api/escola/aluno/entrar/codigo-aluno
 * Confere o código do aluno (o da lista que a escola recebeu) e devolve o primeiro
 * nome e o tipo de senha (PIN ou figuras), sem autenticar. O login vem depois, com o PIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentDisplayParts } from "@/lib/escola/device";
import { alunoPorCodigo } from "@/lib/escola/codigo-aluno-login";

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { code } = await req.json().catch(() => ({}));
  const achado = await alunoPorCodigo(String(code ?? ""));
  if (!achado) {
    return NextResponse.json({ error: "Não achamos esse código. Confira no cartão ou na lista que a escola entregou." }, { status: 404 });
  }
  const { name, initial } = studentDisplayParts(achado.student.fullName);
  return NextResponse.json({ display: initial ? `${name} ${initial}.` : name, loginMode: achado.student.loginMode });
}
