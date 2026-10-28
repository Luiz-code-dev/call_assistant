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
  const q = searchParams.get("q")?.trim() ?? "";
  const subjectCode = searchParams.get("subjectCode") ?? null;
  const subjectId = searchParams.get("subjectId") ?? null;
  const stage = searchParams.get("stage") ?? null;
  const gradeYear = searchParams.get("gradeYear") ?? null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  try {
    // Se subjectId, resolve o subjectCode a partir do nome do EduSubject
    let resolvedSubjectCode = subjectCode;
    if (!resolvedSubjectCode && subjectId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subj = await (prismaEdu as any).eduSubject.findFirst({
        where: { id: subjectId },
        select: { name: true },
      });
      if (subj?.name) {
        const SUBJECT_CODE_MAP: Record<string, string> = {
          "matematica": "MA", "lingua portuguesa": "LP", "ciencias": "CI",
          "historia": "HI", "geografia": "GE", "arte": "AR",
          "educacao fisica": "EF", "lingua inglesa": "LI", "ensino religioso": "ER",
        };
        const normalized = subj.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        resolvedSubjectCode = SUBJECT_CODE_MAP[normalized] ?? null;
      }
    }

    // Filtro de texto: busca insensitive em code, shortLabel e description
    const textFilter = q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { shortLabel: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skills = await (prismaEdu as any).eduSkill.findMany({
      where: {
        ...(resolvedSubjectCode ? { subjectCode: resolvedSubjectCode } : {}),
        ...(stage ? { stage } : {}),
        ...(gradeYear ? { gradeYears: { has: parseInt(gradeYear) } } : {}),
        OR: [{ networkId: null }, { networkId: ctx.networkId }],
        ...textFilter,
      },
      orderBy: [{ subjectCode: "asc" }, { code: "asc" }],
      take: limit,
      select: { id: true, code: true, subjectCode: true, stage: true, gradeYears: true, shortLabel: true, description: true },
    });

    return NextResponse.json({ skills });
  } catch (err) {
    console.error("[api/habilidades]", err);
    return NextResponse.json({ error: "Erro ao buscar habilidades" }, { status: 500 });
  }
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
