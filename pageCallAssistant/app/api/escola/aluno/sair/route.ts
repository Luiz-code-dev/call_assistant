import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { STUDENT_COOKIE } from "@/lib/escola/cookies";
import { publicUrl } from "@/lib/escola/public-url";

// Sair do aluno: apaga SO o cookie do aluno e volta para o login do aluno.
// 303 para o POST do form virar GET. Protege tablet compartilhado.
export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const res = NextResponse.redirect(publicUrl(req, "/escola/aluno/entrar?saiu=1"), 303);
  res.cookies.delete(STUDENT_COOKIE);
  return res;
}
