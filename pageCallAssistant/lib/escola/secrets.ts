/**
 * Segredos dos tokens da Área Escolar — fonte única.
 * Compatível com o middleware (edge): não importar Prisma aqui.
 * Equipe (cookie sf_edu_ctx): EDU_JWT_SECRET · Aluno (cookie sf_edu_student): EDU_STUDENT_JWT_SECRET
 * Família (cookie sf_family_ctx): EDU_FAMILY_JWT_SECRET
 */
function load(name: "EDU_JWT_SECRET" | "EDU_STUDENT_JWT_SECRET" | "EDU_FAMILY_JWT_SECRET", devFallback: string): Uint8Array {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[escolas] Variável ${name} não configurada em produção.`);
    }
    return new TextEncoder().encode(devFallback);
  }
  return new TextEncoder().encode(value);
}

export function staffSecret(): Uint8Array {
  return load("EDU_JWT_SECRET", "edu-dev-secret-change-me");
}

export function studentSecret(): Uint8Array {
  return load("EDU_STUDENT_JWT_SECRET", "student-dev-secret-change-me");
}

export function familySecret(): Uint8Array {
  return load("EDU_FAMILY_JWT_SECRET", "family-dev-secret-change-me");
}
