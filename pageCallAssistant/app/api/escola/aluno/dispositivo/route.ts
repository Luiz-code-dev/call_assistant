import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { DEVICE_COOKIE } from "@/lib/escola/cookies";
import { readDeviceToken } from "@/lib/escola/device";

// Lista os alunos lembrados neste aparelho ("Quem vai praticar agora?").
export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const students = await readDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);
  return NextResponse.json({ students });
}

// "Esquecer este aparelho": apaga o cookie assinado.
export async function DELETE(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEVICE_COOKIE);
  return res;
}
