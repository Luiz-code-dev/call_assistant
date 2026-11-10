/**
 * Código de família (QR da ficha de acesso): prova de que o responsável tem o papel
 * entregue pela escola. Junto com a data de nascimento do aluno, libera o cadastro.
 *
 * - O código fica só com hash na base da rede. No catálogo vai a chave "FAM<hash>",
 *   que diz em qual base procurar (o primeiro acesso não sabe a rede de antemão).
 * - Errar a data 5 vezes bloqueia o código por 30 minutos.
 * - O responsável nunca busca aluno pelo nome: o código já diz qual é o aluno.
 */
import { catalogDb, findTenantByCode, registerCode, unregisterCode } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { genFamilyCode, hashFamilyCode, normalizeFamilyCode, FAMILY_CODE_TTL_DAYS, FAMILY_CODE_ACTIVATIONS } from "@/lib/escola/familia";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

export const MAX_ERROS_DATA = 5;
export const BLOQUEIO_MIN = 30;

export function chaveCatalogo(codeHash: string): string {
  return `FAM${codeHash.toUpperCase()}`;
}

/** "Bia Demo B Santos" -> "B** S*****": o responsável reconhece, um estranho não descobre */
export function nomeParcial(nome: string): string {
  const p = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  const mascara = (w: string) => w[0].toUpperCase() + "*".repeat(Math.max(2, w.length - 1));
  return p.length === 1 ? mascara(p[0]) : `${mascara(p[0])} ${mascara(p[p.length - 1])}`;
}

/** Gera um código novo para o aluno (o anterior deixa de valer). Devolve o código em texto. */
export async function gerarCodigoFamilia(db: any, networkId: string, studentId: string): Promise<{ codigo: string; expiresAt: Date }> {
  const codigo = genFamilyCode();
  const codeHash = hashFamilyCode(codigo);
  const expiresAt = new Date(Date.now() + FAMILY_CODE_TTL_DAYS * 86_400_000);
  const antigo = await db.eduFamilyCode.findUnique({ where: { studentId }, select: { codeHash: true } }).catch(() => null);
  await db.eduFamilyCode.upsert({
    where: { studentId },
    create: { networkId, studentId, codeHash, activationsLeft: FAMILY_CODE_ACTIVATIONS, expiresAt },
    update: { codeHash, activationsLeft: FAMILY_CODE_ACTIVATIONS, expiresAt, failedCount: 0, lockedUntil: null },
  });
  if (antigo?.codeHash) await unregisterCode(chaveCatalogo(antigo.codeHash)).catch(() => null);
  await registerCode("FAMILY_CODE", chaveCatalogo(codeHash), networkId, expiresAt);
  return { codigo, expiresAt };
}

export type CodigoAchado = { db: any; networkId: string; record: any; student: any };

/** Acha o código (e o aluno) em qualquer rede. null se não existe, venceu ou acabaram os cadastros. */
export async function acharCodigoFamilia(codigo: string, soNaRede?: string): Promise<CodigoAchado | null> {
  const norm = normalizeFamilyCode(codigo);
  if (norm.length < 6 || norm.length > 16) return null;
  const codeHash = hashFamilyCode(norm);

  const candidatas: string[] = [];
  const pelaChave = await findTenantByCode(chaveCatalogo(codeHash)).catch(() => null);
  if (pelaChave) candidatas.push(pelaChave);
  else if (soNaRede) candidatas.push(soNaRede);
  else {
    // Códigos gerados antes do catálogo conhecer a chave: procura nas redes ativas
    const redes: Array<{ id: string }> = await catalogDb.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } }).catch(() => []);
    candidatas.push(...redes.map((r) => r.id));
  }

  for (const networkId of candidatas) {
    if (soNaRede && networkId !== soNaRede) continue;
    let db: any;
    try { db = await getTenantDb(networkId); } catch { continue; }
    const record = await db.eduFamilyCode.findFirst({ where: { codeHash, networkId } }).catch(() => null);
    if (!record) continue;
    if (record.activationsLeft <= 0 || new Date(record.expiresAt) < new Date()) return null;
    const student = await db.eduStudent.findFirst({ where: { id: record.studentId, isActive: true } });
    if (!student) return null;
    if (!pelaChave) await registerCode("FAMILY_CODE", chaveCatalogo(codeHash), networkId, new Date(record.expiresAt)).catch(() => null);
    return { db, networkId, record, student };
  }
  return null;
}

export function bloqueado(record: { lockedUntil?: Date | string | null }): number {
  if (!record.lockedUntil) return 0;
  const falta = new Date(record.lockedUntil).getTime() - Date.now();
  return falta > 0 ? Math.ceil(falta / 60_000) : 0;
}

/** Registra um erro de data; devolve a mensagem para o responsável */
export async function registrarErroData(db: any, record: { id: string; failedCount?: number }): Promise<string> {
  const erros = (record.failedCount ?? 0) + 1;
  const trava = erros >= MAX_ERROS_DATA;
  await db.eduFamilyCode.update({
    where: { id: record.id },
    data: { failedCount: trava ? 0 : erros, lockedUntil: trava ? new Date(Date.now() + BLOQUEIO_MIN * 60_000) : null },
  });
  if (trava) return `A data não confere. Por segurança, este código ficou bloqueado por ${BLOQUEIO_MIN} minutos.`;
  const resta = MAX_ERROS_DATA - erros;
  return `A data de nascimento não confere com a do aluno. Você ainda tem ${resta} ${resta === 1 ? "tentativa" : "tentativas"}.`;
}

/** Cadastro aceito: zera os erros e gasta um dos cadastros do código */
export async function usarCodigo(db: any, record: { id: string; activationsLeft: number }) {
  await db.eduFamilyCode.update({ where: { id: record.id }, data: { activationsLeft: record.activationsLeft - 1, failedCount: 0, lockedUntil: null } });
}
