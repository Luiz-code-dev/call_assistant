/**
 * Row-level validators for each import kind.
 * Each validator returns an array of error messages (empty = valid).
 */

import type { ParsedRow } from "./parser";

export interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

// Valid BNCC stage codes accepted in import files
const VALID_STAGES = new Set([
  "ANOS_INICIAIS", "ELEMENTARY_EARLY",
  "ANOS_FINAIS", "ELEMENTARY_LATE",
  "MEDIO", "HIGH_SCHOOL",
  "INFANTIL", "EARLY_CHILDHOOD",
  "EJA",
]);

// Valid shift codes
const VALID_SHIFTS = new Set([
  "MATUTINO", "MORNING",
  "VESPERTINO", "AFTERNOON",
  "NOTURNO", "EVENING",
  "INTEGRAL", "FULL_TIME",
]);

// Valid roles in import
const VALID_ROLES = new Set(["GESTOR_REDE", "COORDENADOR", "DIRETOR", "PROFESSOR", "NETWORK_ADMIN", "COORDINATOR", "SCHOOL_ADMIN", "TEACHER"]);

function required(row: ParsedRow, field: string, rowIdx: number, errors: RowValidationError[]) {
  if (!row[field] || row[field].trim() === "") {
    errors.push({ row: rowIdx, field, message: `Campo '${field}' é obrigatório` });
  }
}

export function validateSchoolRow(row: ParsedRow, rowIdx: number): RowValidationError[] {
  const errors: RowValidationError[] = [];
  required(row, "nome_escola", rowIdx, errors);
  if (row["codigo_inep"] && !/^\d{8}$/.test(row["codigo_inep"].trim())) {
    errors.push({ row: rowIdx, field: "codigo_inep", message: "Código INEP deve ter 8 dígitos" });
  }
  return errors;
}

export function validateStaffRow(row: ParsedRow, rowIdx: number): RowValidationError[] {
  const errors: RowValidationError[] = [];
  required(row, "nome", rowIdx, errors);
  required(row, "email", rowIdx, errors);
  required(row, "papel", rowIdx, errors);
  if (row["email"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["email"])) {
    errors.push({ row: rowIdx, field: "email", message: "E-mail inválido" });
  }
  if (row["papel"] && !VALID_ROLES.has(row["papel"].toUpperCase().trim())) {
    errors.push({ row: rowIdx, field: "papel", message: `Papel inválido: '${row["papel"]}'. Use: PROFESSOR, COORDENADOR, DIRETOR, GESTOR_REDE` });
  }
  return errors;
}

export function validateStudentRow(row: ParsedRow, rowIdx: number): RowValidationError[] {
  const errors: RowValidationError[] = [];
  required(row, "nome_aluno", rowIdx, errors);
  required(row, "matricula_aluno", rowIdx, errors);
  required(row, "turma", rowIdx, errors);

  if (row["etapa"] && !VALID_STAGES.has(row["etapa"].toUpperCase().trim())) {
    errors.push({ row: rowIdx, field: "etapa", message: `Etapa inválida: '${row["etapa"]}'` });
  }
  if (row["turno"] && !VALID_SHIFTS.has(row["turno"].toUpperCase().trim())) {
    errors.push({ row: rowIdx, field: "turno", message: `Turno inválido: '${row["turno"]}'` });
  }
  if (row["data_nascimento"] && row["data_nascimento"].trim() !== "") {
    const d = parseDate(row["data_nascimento"]);
    if (!d) errors.push({ row: rowIdx, field: "data_nascimento", message: "Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA" });
  }
  return errors;
}

export function validateAssignmentRow(row: ParsedRow, rowIdx: number): RowValidationError[] {
  const errors: RowValidationError[] = [];
  required(row, "turma", rowIdx, errors);
  required(row, "componente", rowIdx, errors);
  required(row, "email_professor", rowIdx, errors);
  if (row["email_professor"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["email_professor"])) {
    errors.push({ row: rowIdx, field: "email_professor", message: "E-mail do professor inválido" });
  }
  return errors;
}

/** Parse date from YYYY-MM-DD or DD/MM/YYYY */
export function parseDate(value: string): Date | null {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Normalize import stage code to Prisma EduStage enum value */
export function normalizeStage(raw: string): string {
  const map: Record<string, string> = {
    ANOS_INICIAIS: "ELEMENTARY_EARLY",
    ANOS_FINAIS: "ELEMENTARY_LATE",
    MEDIO: "HIGH_SCHOOL",
    INFANTIL: "EARLY_CHILDHOOD",
    EJA: "EJA",
  };
  const up = raw.toUpperCase().trim();
  return map[up] ?? up;
}

/** Normalize import shift code to Prisma EduShift enum value */
export function normalizeShift(raw: string): string {
  const map: Record<string, string> = {
    MATUTINO: "MORNING",
    VESPERTINO: "AFTERNOON",
    NOTURNO: "EVENING",
    INTEGRAL: "FULL_TIME",
  };
  const up = raw.toUpperCase().trim();
  return map[up] ?? up;
}

/** Normalize import role code to Prisma EduRole enum value */
export function normalizeRole(raw: string): string {
  const map: Record<string, string> = {
    GESTOR_REDE: "NETWORK_ADMIN",
    COORDENADOR: "COORDINATOR",
    DIRETOR: "SCHOOL_ADMIN",
    PROFESSOR: "TEACHER",
  };
  const up = raw.toUpperCase().trim();
  return map[up] ?? up;
}
