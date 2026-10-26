import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { computeGradeHash, signHash } from "@/lib/escola/integrity";
import { isEscolasEnabled, isNotasEnabled } from "@/lib/escola/feature-flag";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled() || !isNotasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get("assessmentId");
  if (!assessmentId) return NextResponse.json({ error: "assessmentId obrigatório" }, { status: 400 });

  const assessment = await prismaEdu.eduAssessment.findUnique({ where: { id: assessmentId, networkId: ctx.networkId } });
  if (!assessment) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });

  const grades = await prismaEdu.eduGradeEntry.findMany({
    where: { assessmentId, networkId: ctx.networkId },
    orderBy: [{ studentId: "asc" }, { version: "desc" }],
    distinct: ["studentId"],
  });
  return NextResponse.json({ grades });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { classSubjectId, assessmentId, rows } = await req.json();
  if (!assessmentId || !Array.isArray(rows)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const assessment = await prismaEdu.eduAssessment.findUnique({ where: { id: assessmentId, networkId: ctx.networkId } });
  if (!assessment) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  if (assessment.status === "PUBLISHED") return NextResponse.json({ error: "Avaliação já publicada" }, { status: 409 });

  // Verify teacher has access to this offer
  if (ctx.role === "TEACHER") {
    const offer = await prismaEdu.eduClassSubject.findUnique({ where: { id: classSubjectId, networkId: ctx.networkId } });
    if (!offer || offer.teacherId !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const saved = [];
  for (const row of rows) {
    const { studentId, score, absent, note } = row;
    if (!studentId) continue;

    const lastEntry = await prismaEdu.eduGradeEntry.findFirst({
      where: { assessmentId, studentId, networkId: ctx.networkId },
      orderBy: { version: "desc" },
      select: { version: true, hash: true },
    });

    const version = (lastEntry?.version ?? 0) + 1;
    const prevHash = lastEntry?.hash ?? "0".repeat(64);
    const enteredAt = new Date().toISOString();

    const entryData = { networkId: ctx.networkId, assessmentId, studentId, value: score, absent: absent ?? false, version, correctionId: null, enteredById: ctx.userId, enteredAt, prevHash };
    const hash = computeGradeHash(entryData);
    let signature = "dev-sig"; let keyId = "dev";
    try { const s = signHash(hash); signature = s.signature; keyId = s.keyId; } catch { /* no key in dev */ }

    const entry = await prismaEdu.eduGradeEntry.create({
      data: { networkId: ctx.networkId, assessmentId, studentId, value: score !== null && score !== undefined ? +score : null, absent: absent ?? false, version, enteredById: ctx.userId, enteredAt: new Date(enteredAt), prevHash, hash, signature, keyId, note: note ?? null },
    });
    saved.push(entry);
  }

  await prismaEdu.eduAuditLog.create({ data: { networkId: ctx.networkId, actorType: "staff", actorId: ctx.userId, action: "grade.enter", entity: "EduAssessment", entityId: assessmentId, metadata: { count: saved.length } } });

  return NextResponse.json({ saved: saved.length }, { status: 201 });
}
