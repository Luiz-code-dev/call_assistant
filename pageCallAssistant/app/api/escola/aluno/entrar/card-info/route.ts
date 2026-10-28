/**
 * POST /api/escola/aluno/entrar/card-info
 * Valida o JWT do cartão e devolve nome + loginMode do aluno (sem autenticar).
 * Usado pela tela web "Ler meu cartão" para saber que figura/PIN mostrar.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentSecret } from "@/lib/escola/secrets";
import { prismaEdu } from "@/lib/escola/db";
import { jwtVerify } from "jose";
import { studentDisplayParts } from "@/lib/escola/device";

function flag() { return isEscolasEnabled(); }

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { qrToken } = await req.json().catch(() => ({}));
  if (!qrToken) return NextResponse.json({ error: "Token ausente" }, { status: 400 });

  try {
    const { payload } = await jwtVerify(qrToken, studentSecret());
    const { studentId, cardVersion } = payload as { studentId: string; cardVersion: number };
    const s = await prismaEdu.eduStudent.findUnique({ where: { id: studentId }, select: { id: true, fullName: true, loginMode: true, cardVersion: true, isActive: true } });
    if (!s || !s.isActive || s.cardVersion !== cardVersion) {
      return NextResponse.json({ error: "Cartão revogado ou inválido" }, { status: 401 });
    }
    const { name, initial } = studentDisplayParts(s.fullName);
    return NextResponse.json({ studentId: s.id, display: initial ? `${name} ${initial}.` : name, loginMode: s.loginMode });
  } catch {
    return NextResponse.json({ error: "QR inválido" }, { status: 401 });
  }
}
