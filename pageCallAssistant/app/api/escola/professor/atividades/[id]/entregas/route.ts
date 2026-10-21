import { createHash, createHmac, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { assertCanViewClassSubject, assertCanManageClassSubject } from "@/lib/escola/permissions";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["TEACHER", "COORDINATOR", "NETWORK_ADMIN", "SCHOOL_ADMIN"]);

/** B9: grava rascunho de nota na planilha (EduGradeEntry) sem publicar */
async function createDraftGradeEntry(
  networkId: string,
  assessmentId: string,
  studentId: string,
  value: number,
  enteredById: string,
  note: string | null,
) {
  try {
    const latest = await (prismaEdu as any).eduGradeEntry.findFirst({
      where: { assessmentId, studentId },
      orderBy: { version: "desc" },
      select: { version: true, hash: true },
    });
    const version = (latest?.version ?? 0) + 1;
    const prevHash = latest?.hash ?? "0".repeat(64);
    const enteredAt = new Date();
    const nonce = randomBytes(8).toString("hex");
    const payload = JSON.stringify({ assessmentId, studentId, value, version, enteredAt: enteredAt.toISOString(), nonce });
    const hash = createHash("sha256").update(payload).digest("hex");
    const keyId = "ai-activity-v1";
    const signKey = process.env.GRADE_SIGN_KEY ?? "dev-sign-key";
    const signature = createHmac("sha256", signKey).update(`${prevHash}:${hash}`).digest("hex");

    await (prismaEdu as any).eduGradeEntry.create({
      data: {
        networkId,
        assessmentId,
        studentId,
        value,
        absent: false,
        version,
        enteredById,
        enteredAt,
        prevHash,
        hash,
        signature,
        keyId,
        note,
      },
    });
  } catch {
    // Não falha a confirmação se o grade entry já existir ou assessment indisponível
  }
}

// GET — lista todas as entregas de uma atividade
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || !ALLOWED_ROLES.has(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // A5: busca com permission check
  const activity = await (prismaEdu as any).eduActivity.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: {
      classSubject: { include: { class: { select: { schoolId: true } } } },
    },
  });
  if (!activity) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  try {
    assertCanViewClassSubject(ctx, {
      teacherId: activity.classSubject.teacherId ?? null,
      networkId: activity.networkId,
      schoolId: activity.classSubject.class?.schoolId ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const cs = await (prismaEdu as any).eduClassSubject.findUnique({
    where: { id: activity.classSubjectId },
    include: {
      class: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
      },
    },
  });

  const enrolledStudents: { id: string; fullName: string }[] =
    cs?.class.enrollments.map((e: any) => e.student) ?? [];

  const submissions = await (prismaEdu as any).eduSubmission.findMany({
    where: { activityId: params.id, networkId: ctx.networkId },
    orderBy: [{ studentId: "asc" }, { attempt: "desc" }],
  });

  const byStudent = new Map<string, unknown>();
  for (const sub of submissions) {
    if (!byStudent.has(sub.studentId)) byStudent.set(sub.studentId, sub);
  }

  const entregas = enrolledStudents.map((s) => ({
    studentId: s.id,
    studentName: s.fullName,
    submission: byStudent.get(s.id) ?? null,
  }));

  return NextResponse.json({ entregas, activity });
}

// PATCH — professor confirma ou ajusta nota + comentário
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || !ALLOWED_ROLES.has(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { submissionId, teacherScore, teacherNote, confirmAll } = body;

  // A5: verifica permissão de gestão
  const activity = await (prismaEdu as any).eduActivity.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: { classSubject: { include: { class: { select: { schoolId: true } } } } },
  });
  if (!activity) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  try {
    assertCanManageClassSubject(ctx, {
      teacherId: activity.classSubject.teacherId ?? null,
      networkId: activity.networkId,
      schoolId: activity.classSubject.class?.schoolId ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const now = new Date();

  // B9: confirmar todas as notas avaliadas pela IA
  if (confirmAll === true) {
    const evaluated = await (prismaEdu as any).eduSubmission.findMany({
      where: { activityId: params.id, networkId: ctx.networkId, status: "EVALUATED" },
      select: { id: true, studentId: true, aiScore: true },
    });
    for (const sub of evaluated) {
      const confirmedScore = Number(sub.aiScore ?? 0);
      await (prismaEdu as any).eduSubmission.update({
        where: { id: sub.id },
        data: {
          status: "REVIEWED",
          reviewedAt: now,
          teacherScore: confirmedScore,  // B9: copia aiScore
        },
      });
      // B9: rascunho planilha
      if (activity.assessmentId) {
        await createDraftGradeEntry(ctx.networkId, activity.assessmentId, sub.studentId, confirmedScore, ctx.userId, null);
      }
    }
    return NextResponse.json({ ok: true, action: "confirmAll", count: evaluated.length });
  }

  if (!submissionId) return NextResponse.json({ error: "submissionId obrigatório" }, { status: 400 });

  const sub = await (prismaEdu as any).eduSubmission.findFirst({
    where: { id: submissionId, activityId: params.id, networkId: ctx.networkId },
  });
  if (!sub) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });

  // B9: se não forneceu teacherScore, usa aiScore como padrão
  const finalScore = teacherScore != null ? Number(teacherScore) : Number(sub.aiScore ?? 0);

  await (prismaEdu as any).eduSubmission.update({
    where: { id: submissionId },
    data: {
      teacherScore: finalScore,
      teacherNote: teacherNote ?? null,
      status: "REVIEWED",
      reviewedAt: now,
    },
  });

  // B9: rascunho planilha
  if (activity.assessmentId) {
    await createDraftGradeEntry(ctx.networkId, activity.assessmentId, sub.studentId, finalScore, ctx.userId, teacherNote ?? null);
  }

  return NextResponse.json({ ok: true });
}
