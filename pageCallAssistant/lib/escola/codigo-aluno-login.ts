/**
 * Acha o aluno pelo código do reforço: o catálogo diz a rede, a base da rede diz o aluno.
 */
import { findTenantByCode } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { codigoValido, normalizarCodigo } from "@/lib/escola/codigo-aluno";

export async function alunoPorCodigo(codigo: string) {
  if (!codigoValido(codigo)) return null;
  const c = normalizarCodigo(codigo);
  const tenantId = await findTenantByCode(c);
  if (!tenantId) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await getTenantDb(tenantId)) as any;
  const student = await db.eduStudent.findFirst({ where: { accessCode: c, networkId: tenantId, isActive: true } });
  if (!student) return null;
  return { db, student };
}
