/**
 * Batch processor — runs after PREVIEW, writes to DB in chunks of 500.
 * Updates EduImportBatch.processed/created/updated/failed/status as it goes.
 * Safe to call from an API route (chunked sync) or a background worker.
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prismaEdu } from "@/lib/escola/db";
import { garantirCodigoAluno } from "@/lib/escola/codigo-aluno";
import type { ParsedRow } from "./parser";
import { parseDate, normalizeStage, normalizeShift, normalizeRole } from "./validators";

const CHUNK_SIZE = 500;

export async function processImportBatch(batchId: string) {
  const batch = await prismaEdu.eduImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Batch not found");
  if (batch.status === "DONE" || batch.status === "CANCELLED") return;

  await prismaEdu.eduImportBatch.update({ where: { id: batchId }, data: { status: "PROCESSING" } });

  try {
    // rows stored in errors field during PREVIEW with key "preview"
    const preview = (batch.errors as { preview?: ParsedRow[] } | null)?.preview ?? [];
    if (!preview.length) {
      await prismaEdu.eduImportBatch.update({ where: { id: batchId }, data: { status: "DONE", finishedAt: new Date() } });
      return;
    }

    let created = 0, updated = 0, failed = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    // Process in chunks
    for (let i = 0; i < preview.length; i += CHUNK_SIZE) {
      const chunk = preview.slice(i, i + CHUNK_SIZE);
      const results = await processChunk(batch.networkId, batch.kind, chunk, i, batch.schoolId ?? null);
      created += results.created;
      updated += results.updated;
      failed += results.failed;
      errors.push(...results.errors);
      await prismaEdu.eduImportBatch.update({
        where: { id: batchId },
        data: { processed: i + chunk.length, created, updated, failed },
      });
    }

    await prismaEdu.eduImportBatch.update({
      where: { id: batchId },
      // Campo Json opcional não aceita null direto no Prisma: lista vazia quando não houve erro.
      data: { status: "DONE", finishedAt: new Date(), created, updated, failed, errors },
    });

    await prismaEdu.eduAuditLog.create({
      data: { networkId: batch.networkId, actorType: "system", actorId: batch.createdById, action: "import.done", entity: "EduImportBatch", entityId: batchId, metadata: { created, updated, failed } },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prismaEdu.eduImportBatch.update({ where: { id: batchId }, data: { status: "FAILED", finishedAt: new Date(), errors: [{ message: msg }] } });
  }
}

async function processChunk(networkId: string, kind: string, rows: ParsedRow[], offset: number, schoolId: string | null) {
  let created = 0, updated = 0, failed = 0;
  const errors: { row: number; field: string; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowIdx = offset + i + 2; // 1-indexed, +1 for header
    const row = rows[i];
    try {
      if (kind === "SCHOOLS") {
        const result = await upsertSchool(networkId, row);
        result === "created" ? created++ : updated++;
      } else if (kind === "STAFF") {
        const result = await upsertStaff(networkId, row);
        result === "created" ? created++ : updated++;
      } else if (kind === "STUDENTS") {
        const result = await upsertStudent(networkId, row, schoolId);
        result === "created" ? created++ : updated++;
      } else if (kind === "ASSIGNMENTS") {
        await upsertAssignment(networkId, row, schoolId);
        updated++;
      }
    } catch (err) {
      failed++;
      errors.push({ row: rowIdx, field: "", message: err instanceof Error ? err.message : String(err) });
    }
  }
  return { created, updated, failed, errors };
}

async function upsertSchool(networkId: string, row: ParsedRow): Promise<"created" | "updated"> {
  const inepCode = row["codigo_inep"]?.trim() || null;
  const name = row["nome_escola"]?.trim();
  if (!name) throw new Error("nome_escola é obrigatório");

  const existing = inepCode
    ? await prismaEdu.eduSchool.findFirst({ where: { networkId, inepCode } })
    : await prismaEdu.eduSchool.findFirst({ where: { networkId, name } });

  if (existing) {
    await prismaEdu.eduSchool.update({ where: { id: existing.id }, data: { name, inepCode, isActive: true } });
    return "updated";
  }
  await prismaEdu.eduSchool.create({ data: { networkId, name, inepCode, isActive: true } });
  return "created";
}

async function upsertStaff(networkId: string, row: ParsedRow): Promise<"created" | "updated"> {
  const email = row["email"]?.trim().toLowerCase();
  const name = row["nome"]?.trim();
  const role = normalizeRole(row["papel"] ?? "TEACHER");
  const inepCode = row["codigo_inep_escola"]?.trim() || null;

  if (!email || !name) throw new Error("nome e email são obrigatórios");

  // Find or create school scope
  let schoolId: string | null = null;
  if (inepCode) {
    const school = await prismaEdu.eduSchool.findFirst({ where: { networkId, inepCode } });
    if (!school) throw new Error(`Escola com INEP ${inepCode} não encontrada`);
    schoolId = school.id;
  }

  // Conta do servidor nesta rede (EduUser). O banco da rede não tem a tabela "user":
  // a consulta antiga falhava e nenhum servidor era importado.
  const user = await prismaEdu.eduUser.findFirst({ where: { networkId, email } });

  // Create invite regardless (will be sent via email separately)
  const tokenRaw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(tokenRaw).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const existingInvite = await prismaEdu.eduInvite.findFirst({ where: { networkId, email } });

  if (!existingInvite) {
    await prismaEdu.eduInvite.create({
      data: { networkId, schoolId, email, name, role, tokenHash, expiresAt, userId: user?.id ?? null, createdById: "system", sentCount: 1 },
    });
  }

  if (user) {
    // Upsert membership
    const existing = await prismaEdu.eduMembership.findFirst({ where: { networkId, userId: user.id, schoolId, role } });
    if (existing) {
      await prismaEdu.eduMembership.update({ where: { id: existing.id }, data: { isActive: true } });
      return "updated";
    }
    await prismaEdu.eduMembership.create({ data: { networkId, userId: user.id, schoolId, role, isActive: true } });
    return "created";
  }
  return "created";
}

async function upsertStudent(networkId: string, row: ParsedRow, defaultSchoolId: string | null): Promise<"created" | "updated"> {
  const enrollmentCode = row["matricula_aluno"]?.trim();
  const fullName = row["nome_aluno"]?.trim();
  const turma = row["turma"]?.trim();
  const inepCode = row["codigo_inep"]?.trim() || null;
  const stageRaw = row["etapa"]?.trim() || "ELEMENTARY_LATE";
  const shiftRaw = row["turno"]?.trim() || "MORNING";
  const gradeYearRaw = row["ano_serie"]?.trim();
  const birthDateRaw = row["data_nascimento"]?.trim();

  if (!enrollmentCode || !fullName) throw new Error("matricula_aluno e nome_aluno são obrigatórios");

  const stage = normalizeStage(stageRaw);
  const shift = normalizeShift(shiftRaw);
  const gradeYear = gradeYearRaw ? parseInt(gradeYearRaw, 10) : 1;
  const birthDate = birthDateRaw ? parseDate(birthDateRaw) : null;

  // Find school
  let schoolId = defaultSchoolId;
  if (inepCode) {
    const school = await prismaEdu.eduSchool.findFirst({ where: { networkId, inepCode } });
    if (!school) throw new Error(`Escola com INEP ${inepCode} não encontrada`);
    schoolId = school.id;
  }
  if (!schoolId) throw new Error("Escola não identificada (codigo_inep obrigatório ou defina escola padrão)");

  // Upsert student (key = networkId + enrollmentCode)
  const existing = await prismaEdu.eduStudent.findFirst({ where: { networkId, enrollmentCode } });

  let studentId: string;
  let action: "created" | "updated" = "created";

  if (existing) {
    await prismaEdu.eduStudent.update({ where: { id: existing.id }, data: { fullName, birthDate: birthDate ?? undefined, isActive: true } });
    studentId = existing.id;
    action = "updated";
  } else {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const pinHash = await bcrypt.hash(pin, 10);
    const student = await prismaEdu.eduStudent.create({ data: { networkId, enrollmentCode, fullName, birthDate, pinHash, isActive: true } });
    studentId = student.id;
    // Código do aluno para entrar no reforço (o aluno importado ficava sem código).
    await garantirCodigoAluno(prismaEdu, studentId, networkId).catch(() => null);
  }

  // Handle class enrollment if turma is provided
  if (turma && schoolId) {
    const currentYear = await prismaEdu.eduSchoolYear.findFirst({ where: { networkId, isCurrent: true } });
    if (currentYear) {
      // Find or create class
      let cls = await prismaEdu.eduClass.findFirst({ where: { networkId, schoolId, schoolYearId: currentYear.id, name: turma } });
      if (!cls) {
        const code = crypto.randomBytes(3).toString("hex").toUpperCase();
        cls = await prismaEdu.eduClass.create({
          data: { networkId, schoolId, schoolYearId: currentYear.id, name: turma, stage, gradeYear, shift, accessCode: code, isActive: true },
        });
      }

      // Check for existing active enrollment in current year
      const activeEnrollment = await prismaEdu.eduEnrollment.findFirst({
        where: { studentId, schoolYearId: currentYear.id, status: "ACTIVE" },
      });

      if (activeEnrollment && activeEnrollment.classId !== cls.id) {
        // Transfer: close old, create new
        await prismaEdu.eduEnrollment.update({ where: { id: activeEnrollment.id }, data: { status: "TRANSFERRED", endedAt: new Date() } });
        await prismaEdu.eduEnrollment.create({ data: { networkId, studentId, classId: cls.id, schoolYearId: currentYear.id, status: "ACTIVE" } });
      } else if (!activeEnrollment) {
        await prismaEdu.eduEnrollment.create({ data: { networkId, studentId, classId: cls.id, schoolYearId: currentYear.id, status: "ACTIVE" } });
      }
    }
  }

  return action;
}

async function upsertAssignment(networkId: string, row: ParsedRow, schoolId: string | null) {
  const inepCode = row["codigo_inep"]?.trim() || null;
  const turma = row["turma"]?.trim();
  const componente = row["componente"]?.trim();
  const emailProfessor = row["email_professor"]?.trim().toLowerCase();

  if (!turma || !componente || !emailProfessor) throw new Error("turma, componente e email_professor são obrigatórios");

  let resolvedSchoolId = schoolId;
  if (inepCode) {
    const school = await prismaEdu.eduSchool.findFirst({ where: { networkId, inepCode } });
    if (!school) throw new Error(`Escola com INEP ${inepCode} não encontrada`);
    resolvedSchoolId = school.id;
  }

  const teacher = await prismaEdu.eduUser.findFirst({ where: { networkId, email: emailProfessor } });
  if (!teacher) throw new Error(`Professor com e-mail ${emailProfessor} ainda não tem conta nesta rede (o convite precisa ser aceito antes da atribuição)`);

  const currentYear = await prismaEdu.eduSchoolYear.findFirst({ where: { networkId, isCurrent: true } });
  if (!currentYear) throw new Error("Nenhum ano letivo corrente definido");

  const where = resolvedSchoolId
    ? { networkId, schoolId: resolvedSchoolId, schoolYearId: currentYear.id, name: turma }
    : { networkId, schoolYearId: currentYear.id, name: turma };

  const cls = await prismaEdu.eduClass.findFirst({ where });
  if (!cls) throw new Error(`Turma '${turma}' não encontrada`);

  const subject = await prismaEdu.eduSubject.findFirst({ where: { networkId, name: componente } });
  if (!subject) throw new Error(`Componente '${componente}' não encontrado`);

  // Cria a oferta do componente na turma se ainda não existir, e liga o professor.
  await prismaEdu.eduClassSubject.upsert({
    where: { classId_subjectId: { classId: cls.id, subjectId: subject.id } },
    create: { networkId, classId: cls.id, subjectId: subject.id, teacherId: teacher.id },
    update: { teacherId: teacher.id },
  });
}
