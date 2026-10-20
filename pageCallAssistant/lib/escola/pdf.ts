/**
 * lib/escola/pdf.ts
 * Stub para geração de PDFs da Área Escolar.
 * A dependência pdf-lib será adicionada na Fase 7.
 * Todas as funções lançam um erro descritivo até a implementação real.
 */

export interface TermClosurePdfInput {
  networkName: string;
  schoolName: string;
  className: string;
  subjectName: string;
  termName: string;
  year: number;
  verificationCode: string;
  entries: Array<{
    enrollmentCode: string;
    average: number;
    absent: number;
    status: string;
  }>;
  closedAt: string;
  closedByName: string;
  rootHash: string;
}

export interface StudentAccessCardInput {
  networkName: string;
  schoolName: string;
  className: string;
  enrollmentCode: string;
  accessCode: string;
  pin: string;
  studentName?: string;
}

export async function generateTermClosurePdf(_input: TermClosurePdfInput): Promise<Buffer> {
  throw new Error(
    "[edu/pdf] generateTermClosurePdf não implementado. Adicionar pdf-lib na Fase 7."
  );
}

export async function generateStudentAccessCard(_input: StudentAccessCardInput): Promise<Buffer> {
  throw new Error(
    "[edu/pdf] generateStudentAccessCard não implementado. Adicionar pdf-lib na Fase 7."
  );
}
