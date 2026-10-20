import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { can } from "@/lib/escola/permissions";

const createSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  ibgeCode: z.string().optional(),
  gradeConfig: z.unknown().optional(),
});

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!can(ctx.role, "network:read")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const network = await db.eduNetwork.findUnique({
    where: { id: ctx.networkId },
    include: { schools: { where: { isActive: true }, orderBy: { name: "asc" } } },
  });

  return NextResponse.json(network);
}

export async function PATCH(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!can(ctx.role, "network:write")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = createSchema.partial().safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { gradeConfig, ...rest } = body.data;
  const updated = await db.eduNetwork.update({
    where: { id: ctx.networkId },
    data: {
      ...rest,
      ...(gradeConfig !== undefined && { gradeConfig: gradeConfig as Prisma.InputJsonValue }),
    },
  });

  return NextResponse.json(updated);
}
