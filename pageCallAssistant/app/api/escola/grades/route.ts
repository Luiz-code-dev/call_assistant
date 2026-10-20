import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { can } from "@/lib/escola/permissions";
import { computeGradeHash, signHash } from "@/lib/escola/integrity";

const entrySchema = z.object({
  assessmentId: z.string().min(1),
  studentId: z.string().min(1),
  value: z.number().min(0).max(100).nullable(),
  absent: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!can(ctx.role, "grade:read")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const assessmentId = req.nextUrl.searchParams.get("assessmentId");
  if (!assessmentId) return NextResponse.json({ error: "assessmentId obrigatório" }, { status: 400 });

  const assessment = await db.eduAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      classSubject: { select: { networkId: true } },
    },
  });
  if (!assessment || assessment.classSubject.networkId !== ctx.networkId) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }

  const entries = await db.eduGradeEntry.findMany({
    where: { assessmentId, networkId: ctx.networkId },
    orderBy: [{ studentId: "asc" }, { version: "desc" }],
    distinct: ["studentId"],
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!can(ctx.role, "grade:enter")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const parsed = entrySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { assessmentId, studentId, value, absent } = parsed.data;

  const assessment = await db.eduAssessment.findUnique({
    where: { id: assessmentId },
    include: { classSubject: { select: { networkId: true } } },
  });
  if (!assessment || assessment.classSubject.networkId !== ctx.networkId) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }
  if (assessment.status === "PUBLISHED") {
    return NextResponse.json({ error: "Avaliação já publicada" }, { status: 409 });
  }

  const term = await db.eduTerm.findUnique({ where: { id: assessment.termId } });
  if (!term || term.status === "CLOSED") {
    return NextResponse.json({ error: "Bimestre encerrado" }, { status: 409 });
  }

  const lastEntry = await db.eduGradeEntry.findFirst({
    where: { assessmentId, studentId, networkId: ctx.networkId },
    orderBy: { version: "desc" },
    select: { version: true, hash: true },
  });

  const version = (lastEntry?.version ?? 0) + 1;
  const prevHash = lastEntry?.hash ?? "0".repeat(64);
  const enteredAt = new Date().toISOString();

  const entryData = {
    networkId: ctx.networkId,
    assessmentId,
    studentId,
    value,
    absent,
    version,
    correctionId: null,
    enteredById: ctx.userId,
    enteredAt,
    prevHash,
  };

  const hash = computeGradeHash(entryData);
  const { signature, keyId } = signHash(hash);

  const entry = await db.eduGradeEntry.create({
    data: {
      networkId: ctx.networkId,
      assessmentId,
      studentId,
      value: value !== null ? value : undefined,
      absent,
      version,
      correctionId: null,
      enteredById: ctx.userId,
      enteredAt: new Date(enteredAt),
      prevHash,
      hash,
      signature,
      keyId,
    },
  });

  await db.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "staff",
      actorId: ctx.userId,
      action: "grade:enter",
      entity: "EduGradeEntry",
      entityId: entry.id,
      metadata: { assessmentId, studentId, version },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
