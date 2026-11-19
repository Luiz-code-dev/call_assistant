/**
 * GET /api/escola/plataforma/administradores
 * Lista administradores de plataforma (PLATFORM_ADMIN)
 */
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { catalogDb } from "@/lib/escola/catalogo";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Administradores de plataforma ficam no catálogo, e não no banco de uma rede.
  const admins: { id: string; name: string; email: string; isActive: boolean }[] = await catalogDb.platformAdmin.findMany({
    select: { id: true, name: true, email: true, isActive: true },
    orderBy: { name: "asc" },
  }).catch(() => []);

  return NextResponse.json({ admins });
}
