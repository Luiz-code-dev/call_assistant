import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

function flag() { return isEscolasEnabled(); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

const TRACK_INCLUDE = {
  items: { orderBy: { order: "asc" } as const },
  skills: { select: { id: true, code: true, shortLabel: true, description: true } },
};

/**
 * GET /api/escola/trilhas
 * ?aba=minhas|biblioteca|atribuidas
 * ?subjectId=&gradeYear=&skillId=
 */
export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const aba        = sp.get("aba") ?? "minhas";
  const subjectId  = sp.get("subjectId") ?? undefined;
  const gradeYear  = sp.get("gradeYear") ? parseInt(sp.get("gradeYear")!) : undefined;
  const skillId    = sp.get("skillId") ?? undefined;

  const base = {
    networkId: ctx.networkId,
    ...(subjectId  ? { subjectId }                         : {}),
    ...(gradeYear  ? { gradeYear }                         : {}),
    ...(skillId    ? { skillIds: { has: skillId } }        : {}),
  };

  if (aba === "biblioteca") {
    const tracks = await p.eduTrack.findMany({
      where: { ...base, status: "APPROVED" },
      include: { ...TRACK_INCLUDE, _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" as const },
    });
    return NextResponse.json({ tracks });
  }

  if (aba === "atribuidas") {
    // Trilhas atribuídas pelo professor às suas turmas
    const tracks = await p.eduTrack.findMany({
      where: {
        ...base,
        status: "APPROVED",
        assignments: { some: { assignedBy: ctx.userId, endedAt: null } },
      },
      include: {
        ...TRACK_INCLUDE,
        assignments: {
          where: { assignedBy: ctx.userId, endedAt: null },
          select: {
            id: true, classId: true, studentId: true, dueAt: true,
            _count: { select: { progress: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" as const },
    });
    return NextResponse.json({ tracks });
  }

  // "pendentes" — para COORDINATOR e NETWORK_ADMIN: trilhas SUBMITTED de toda a rede
  if (aba === "pendentes") {
    if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role))
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const tracks = await p.eduTrack.findMany({
      where: { ...base, status: "SUBMITTED" },
      include: {
        ...TRACK_INCLUDE,
        createdByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" as const },
    }).catch(() => p.eduTrack.findMany({
      where: { ...base, status: "SUBMITTED" },
      include: TRACK_INCLUDE,
      orderBy: { createdAt: "desc" as const },
    }));
    return NextResponse.json({ tracks });
  }

  // "minhas" — rascunhos e trilhas do professor
  const tracks = await p.eduTrack.findMany({
    where: { ...base, createdById: ctx.userId },
    include: TRACK_INCLUDE,
    orderBy: { createdAt: "desc" as const },
  });
  return NextResponse.json({ tracks });
}

/** POST: cria trilha nova como DRAFT. Valida 3-8 itens, 1-3 habilidades, ≤15 min/item. */
const createSchema = z.object({
  title:     z.string().min(1).max(200),
  subjectId: z.string().min(1),
  gradeYear: z.number().int().min(1).max(9),
  skillIds:  z.array(z.string().min(1)).min(1).max(3),
  items:     z.array(z.object({
    activityId: z.string().min(1),
    order:      z.number().int().min(0),
    estMinutes: z.number().int().min(1).max(15).default(10),
  })).min(3).max(8),
});

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER","COORDINATOR","NETWORK_ADMIN"].includes(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { items, skillIds, ...rest } = parsed.data;
  const track = await p.eduTrack.create({
    data: {
      ...rest,
      networkId: ctx.networkId,
      skillIds,
      createdById: ctx.userId,
      status: "DRAFT",
      items: { create: items },
    },
    include: TRACK_INCLUDE,
  });
  return NextResponse.json({ track }, { status: 201 });
}
