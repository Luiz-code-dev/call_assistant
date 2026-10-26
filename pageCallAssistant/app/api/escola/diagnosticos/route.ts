import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

function flag() { return isEscolasEnabled(); }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const diagnostics = await (prismaEdu as any).eduDiagnostic.findMany({
    where: {
      networkId: ctx.networkId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { skill: { select: { code: true, shortLabel: true } } } } },
  });
  return NextResponse.json({ diagnostics });
}

const createSchema = z.object({
  subjectId: z.string().min(1),
  gradeYear: z.number().int().min(1).max(9),
  title: z.string().min(1),
  cycle: z.number().int().min(1).default(1),
  items: z.array(z.object({
    skillId: z.string().min(1),
    activityId: z.string().min(1),
    order: z.number().int().min(0),
  })).min(1),
});

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN" && ctx.role !== "COORDINATOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { items, ...rest } = parsed.data;
  const diagnostic = await (prismaEdu as any).eduDiagnostic.create({
    data: {
      ...rest,
      networkId: ctx.networkId,
      createdById: ctx.userId,
      items: { create: items.map(i => ({ skillId: i.skillId, activityId: i.activityId, order: i.order })) },
    },
    include: { items: true },
  });
  return NextResponse.json({ diagnostic }, { status: 201 });
}
