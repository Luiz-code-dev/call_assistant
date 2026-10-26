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
  const subjectId = searchParams.get("subjectId");
  const gradeYear = searchParams.get("gradeYear");

  const tracks = await (prismaEdu as any).eduTrack.findMany({
    where: {
      networkId: ctx.networkId,
      ...(status ? { status } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(gradeYear ? { gradeYear: parseInt(gradeYear) } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { order: "asc" }, include: { track: false } },
    },
  });
  return NextResponse.json({ tracks });
}

const createSchema = z.object({
  subjectId: z.string().min(1),
  gradeYear: z.number().int().min(1).max(9),
  title: z.string().min(1),
  skillIds: z.array(z.string()).min(1),
  items: z.array(z.object({
    activityId: z.string().min(1),
    order: z.number().int().min(0),
    estMinutes: z.number().int().min(1).max(60).default(10),
  })).min(1).max(8),
});

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN" && ctx.role !== "COORDINATOR" && ctx.role !== "TEACHER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { items, skillIds, ...rest } = parsed.data;
  const track = await (prismaEdu as any).eduTrack.create({
    data: {
      ...rest,
      networkId: ctx.networkId,
      skillIds,
      createdById: ctx.userId,
      items: { create: items },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ track }, { status: 201 });
}
