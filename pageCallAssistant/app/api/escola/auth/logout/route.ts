import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { STAFF_COOKIE, PENDING_UID_COOKIE } from "@/lib/escola/cookies";
import { publicUrl } from "@/lib/escola/public-url";

// Sair da equipe: apaga o cookie da equipe (e o de escolha de perfil) e volta
// para o login da equipe. 303 funciona tanto com <form> quanto com fetch.
export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const res = NextResponse.redirect(publicUrl(req, "/escola/entrar?saiu=1"), 303);
  res.cookies.delete(STAFF_COOKIE);
  res.cookies.delete(PENDING_UID_COOKIE);
  return res;
}
