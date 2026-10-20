import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { parseFileBuffer } from "@/lib/escola/import/parser";
import { validateSchoolRow, validateStaffRow, validateStudentRow, validateAssignmentRow } from "@/lib/escola/import/validators";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

const KIND_MAP: Record<string, string> = {
  escolas: "SCHOOLS", servidores: "STAFF", alunos: "STUDENTS", atribuicoes: "ASSIGNMENTS",
  schools: "SCHOOLS", staff: "STAFF", students: "STUDENTS", assignments: "ASSIGNMENTS",
};

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const batches = await prismaEdu.eduImportBatch.findMany({
    where: { networkId: ctx.networkId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, kind: true, status: true, fileName: true, totalRows: true, processed: true, created: true, updated: true, failed: true, createdAt: true, finishedAt: true },
  });
  return NextResponse.json({ batches });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kindRaw = (formData.get("kind") as string ?? "").toLowerCase();
  const kind = KIND_MAP[kindRaw] ?? kindRaw.toUpperCase();

  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  if (!["SCHOOLS", "STAFF", "STUDENTS", "ASSIGNMENTS"].includes(kind)) {
    return NextResponse.json({ error: "Tipo inválido. Use: escolas, servidores, alunos, atribuicoes" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande (max 20 MB)" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parseFileBuffer(buf, file.type);

  // Column mapping: build default map from parsed headers
  const columnMap: Record<string, string> = {};
  parsed.headers.forEach(h => { columnMap[h] = h; });

  // Validate all rows
  const validationErrors: { row: number; field: string; message: string }[] = [];
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    let errs: typeof validationErrors = [];
    if (kind === "SCHOOLS") errs = validateSchoolRow(row, i + 2);
    else if (kind === "STAFF") errs = validateStaffRow(row, i + 2);
    else if (kind === "STUDENTS") errs = validateStudentRow(row, i + 2);
    else if (kind === "ASSIGNMENTS") errs = validateAssignmentRow(row, i + 2);
    validationErrors.push(...errs);
  }

  const validRows = parsed.rows.filter((_, i) => {
    const rowErrors = validationErrors.filter(e => e.row === i + 2);
    return rowErrors.length === 0;
  });

  // Create batch in PREVIEW state, storing valid rows for later processing
  const batch = await prismaEdu.eduImportBatch.create({
    data: {
      networkId: ctx.networkId,
      kind,
      status: "PREVIEW",
      fileName: file.name,
      columnMap,
      totalRows: parsed.rowCount,
      processed: 0,
      created: 0,
      updated: 0,
      failed: validationErrors.length,
      errors: { preview: validRows, validation: validationErrors } as unknown as Record<string, unknown>,
      createdById: ctx.userId,
    },
  });

  return NextResponse.json({
    batchId: batch.id,
    totalRows: parsed.rowCount,
    validRows: validRows.length,
    invalidRows: validationErrors.length,
    validationErrors: validationErrors.slice(0, 100),
    headers: parsed.headers,
  }, { status: 201 });
}
