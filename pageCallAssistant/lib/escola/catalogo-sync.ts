/**
 * lib/escola/catalogo-sync.ts
 * Mantém o catálogo sempre sincronizado com as bases de dados das redes.
 * Chamado por rotas que criam/alteram/desativam EduUser, EduGuardian e códigos.
 */
import { registerLogin, unregisterLogin, registerCode, unregisterCode } from "./catalogo";

/** Registra ou atualiza o índice de login de um membro da equipe escolar. */
export async function syncStaffLogin(email: string, tenantId: string): Promise<void> {
  await registerLogin("STAFF", email, tenantId);
}

/** Remove o índice de login de um membro da equipe escolar. */
export async function removeStaffLogin(email: string, tenantId: string): Promise<void> {
  await unregisterLogin("STAFF", email, tenantId);
}

/** Registra ou atualiza o índice de login de um responsável (família). */
export async function syncGuardianLogin(identifier: string, tenantId: string): Promise<void> {
  await registerLogin("GUARDIAN", identifier, tenantId);
}

/** Remove o índice de login de um responsável. */
export async function removeGuardianLogin(identifier: string, tenantId: string): Promise<void> {
  await unregisterLogin("GUARDIAN", identifier, tenantId);
}

/** Registra um código de turma (accessCode) no catálogo. */
export async function syncClassCode(code: string, tenantId: string): Promise<void> {
  await registerCode("CLASS_ACCESS", code, tenantId);
}

/** Remove um código de turma do catálogo. */
export async function removeClassCode(code: string): Promise<void> {
  await unregisterCode(code);
}

/** Registra um código de sessão de aula no catálogo (com expiração). */
export async function syncSessionCode(code: string, tenantId: string, expiresAt: Date): Promise<void> {
  await registerCode("CLASS_SESSION", code, tenantId, expiresAt);
}

/** Registra um código de família no catálogo. */
export async function syncFamilyCode(code: string, tenantId: string, expiresAt?: Date): Promise<void> {
  await registerCode("FAMILY_CODE", code, tenantId, expiresAt);
}

/** Remove um código de família do catálogo. */
export async function removeFamilyCode(code: string): Promise<void> {
  await unregisterCode(code);
}
