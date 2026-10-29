/**
 * GET /api/escola/plataforma/administradores
 * Lista administradores de plataforma (PLATFORM_ADMIN)
 */
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

const P = prismaEdu as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const members = await P.eduNetworkMember.findMany({
    where: { role: "PLATFORM_ADMIN" },
    select: { id: true, isActive: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  }).catch(() => []);

  const admins = (members as { id: string; isActive: boolean; user: { id: string; name: string; email: string } | null }[])
    .filter(m => m.user)
    .map(m => ({
      id: m.user!.id,
      name: m.user!.name ?? "—",
      email: m.user!.email ?? "—",
      isActive: m.isActive,
    }));

  return NextResponse.json({ admins });
}
