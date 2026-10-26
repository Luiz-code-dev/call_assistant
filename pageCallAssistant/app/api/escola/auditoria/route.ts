import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","COORDINATOR","SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const entity = searchParams.get("entity");
  const where: Record<string, unknown> = { networkId: ctx.networkId };
  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId) where["schoolId"] = ctx.schoolId;
  if (action) where["action"] = { contains: action };
  if (entity) where["entity"] = { contains: entity };
  const logs = await prismaEdu.eduAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ logs });
}
