import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { normalizePhone } from "@/lib/escola/phone";

function flag() { return isEscolasEnabled(); }

// Busca um responsável existente na rede por celular ou e-mail, para a escola
// confirmar e ligar ao mesmo cadastro (nunca duplicar). Só dentro da rede.
export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const contato = (new URL(req.url).searchParams.get("contato") ?? "").trim();
  if (contato.length < 3) return NextResponse.json({ guardian: null });

  const isEmail = contato.includes("@");
  const phoneN = normalizePhone(contato);
  const guardian = await prismaEdu.eduGuardian.findFirst({
    where: { networkId: ctx.networkId, ...(isEmail ? { email: contato } : { phone: { endsWith: phoneN.slice(-8) } }) },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!guardian) return NextResponse.json({ guardian: null });

  const links = await prismaEdu.eduGuardianLink.findMany({
    where: { networkId: ctx.networkId, guardianId: guardian.id, isActive: true },
    select: { studentId: true },
  });
  const ids = links.map((l: { studentId: string }) => l.studentId);
  const filhos = ids.length
    ? await prismaEdu.eduStudent.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } })
    : [];

  return NextResponse.json({ guardian: { ...guardian, filhos } });
}
