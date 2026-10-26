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
  const subjectCode = searchParams.get("subjectCode");
  const stage = searchParams.get("stage");
  const gradeYear = searchParams.get("gradeYear");

  const skills = await (prismaEdu as any).eduSkill.findMany({
    where: {
      ...(subjectCode ? { subjectCode } : {}),
      ...(stage ? { stage } : {}),
      ...(gradeYear ? { gradeYears: { has: parseInt(gradeYear) } } : {}),
      OR: [{ networkId: null }, { networkId: ctx.networkId }],
    },
    orderBy: [{ subjectCode: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ skills });
}

const createSchema = z.object({
  code: z.string().min(1),
  subjectCode: z.string().min(1),
  stage: z.string().min(1),
  gradeYears: z.array(z.number().int().min(1).max(9)),
  description: z.string().min(1),
  shortLabel: z.string().optional(),
  networkId: z.string().optional(),
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

  const skill = await (prismaEdu as any).eduSkill.create({
    data: { ...parsed.data, networkId: parsed.data.networkId ?? ctx.networkId },
  });
  return NextResponse.json({ skill }, { status: 201 });
}
