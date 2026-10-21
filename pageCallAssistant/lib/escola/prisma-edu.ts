/**
 * Cliente Prisma com isolamento automático por rede (networkId).
 * Todos os modelos Edu* que possuem o campo networkId recebem o filtro
 * injetado automaticamente em findMany/findFirst/count/updateMany/deleteMany.
 *
 * Modelos sem networkId (EduQuizQuestion, EduPlatformAdmin, EduAccountState)
 * passam direto — a validação de escopo é feita via relacionamento.
 */

import { db } from "@/lib/db";

/** Modelos Edu* que têm campo networkId e devem ser isolados */
const NETWORK_SCOPED = new Set([
  "EduNetwork",
  "EduSchool",
  "EduSchoolYear",
  "EduTerm",
  "EduSubject",
  "EduCurriculumItem",
  "EduClass",
  "EduClassSubject",
  "EduStudent",
  "EduEnrollment",
  "EduTeachingPlan",
  "EduTopic",
  "EduAssessment",
  "EduGradeEntry",
  "EduGradeCorrection",
  "EduTermClosure",
  "EduAuditLog",
  "EduImportBatch",
  "EduMembership",
  "EduActivity",
  "EduSubmission",
  "EduClassSession",
]);

const SCOPED_OPS = new Set([
  "findMany",
  "findFirst",
  "count",
  "aggregate",
  "updateMany",
  "deleteMany",
]);

/**
 * Retorna um cliente Prisma que injeta automaticamente { networkId } em
 * todas as queries de leitura/escrita em massa nos modelos Edu*.
 *
 * findUnique/findUniqueOrThrow permanecem livres (buscam por ID único);
 * o código de chamada deve validar networkId manualmente nesses casos.
 */
export function getEduDb(networkId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (NETWORK_SCOPED.has(model as string) && SCOPED_OPS.has(operation as string)) {
            args = { ...args, where: { networkId, ...(args.where ?? {}) } };
          }
          return query(args);
        },
      },
    },
  });
}

/** Para code paths que ainda não têm contexto de rede (admin, convites, etc.) */
export const prismaEdu = db;
