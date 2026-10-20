export type EduRole = "NETWORK_ADMIN" | "COORDINATOR" | "SCHOOL_ADMIN" | "TEACHER";
export type EduStage = "EARLY_CHILDHOOD" | "ELEMENTARY_EARLY" | "ELEMENTARY_LATE" | "HIGH_SCHOOL" | "EJA";
export type EduShift = "MORNING" | "AFTERNOON" | "EVENING" | "FULL_TIME";
export type EduTermStatus = "OPEN" | "CLOSED";
export type EduEnrollmentStatus = "ACTIVE" | "TRANSFERRED" | "PROMOTED" | "RETAINED" | "COMPLETED" | "CANCELLED";
export type EduPlanStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
export type EduAssessmentType = "EXAM" | "ASSIGNMENT" | "PROJECT" | "AI_ACTIVITY" | "RECOVERY" | "OTHER";
export type EduAssessmentStatus = "DRAFT" | "OPEN" | "GRADING" | "PUBLISHED";
export type EduCorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export const STAGE_LABEL: Record<EduStage, string> = {
  EARLY_CHILDHOOD: "Educação Infantil",
  ELEMENTARY_EARLY: "Fund. Anos Iniciais",
  ELEMENTARY_LATE: "Fund. Anos Finais",
  HIGH_SCHOOL: "Ensino Médio",
  EJA: "EJA",
};

export const SHIFT_LABEL: Record<EduShift, string> = {
  MORNING: "Manhã",
  AFTERNOON: "Tarde",
  EVENING: "Noturno",
  FULL_TIME: "Integral",
};

export const ROLE_LABEL: Record<EduRole, string> = {
  NETWORK_ADMIN: "Gestor de Rede",
  COORDINATOR: "Coordenação",
  SCHOOL_ADMIN: "Direção",
  TEACHER: "Professor",
};

export const PLAN_STATUS_LABEL: Record<EduPlanStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em análise",
  APPROVED: "Aprovado",
  ARCHIVED: "Arquivado",
};

export const ASSESSMENT_TYPE_LABEL: Record<EduAssessmentType, string> = {
  EXAM: "Prova",
  ASSIGNMENT: "Trabalho",
  PROJECT: "Projeto",
  AI_ACTIVITY: "Atividade IA",
  RECOVERY: "Recuperação",
  OTHER: "Outro",
};

export const ASSESSMENT_STATUS_LABEL: Record<EduAssessmentStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  GRADING: "Corrigindo",
  PUBLISHED: "Publicada",
};

export const CORRECTION_STATUS_LABEL: Record<EduCorrectionStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

export type EduImportKind = "SCHOOLS" | "STAFF" | "STUDENTS" | "ASSIGNMENTS";
export type EduImportStatus = "UPLOADED" | "PREVIEW" | "PROCESSING" | "DONE" | "FAILED" | "CANCELLED";
export type EduStudentLoginMode = "PIN" | "PICTURE";

export const IMPORT_KIND_LABEL: Record<EduImportKind, string> = {
  SCHOOLS: "Escolas",
  STAFF: "Servidores",
  STUDENTS: "Alunos e Turmas",
  ASSIGNMENTS: "Atribuições",
};

export const IMPORT_STATUS_LABEL: Record<EduImportStatus, string> = {
  UPLOADED: "Enviado",
  PREVIEW: "Pré-visualização",
  PROCESSING: "Processando",
  DONE: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};
