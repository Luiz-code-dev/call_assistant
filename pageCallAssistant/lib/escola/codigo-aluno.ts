/**
 * Código do aluno para entrar no reforço.
 *
 * O reforço não depende do professor: a escola contrata, nós cadastramos os alunos
 * e entregamos à escola a lista com o código de cada um. A escola repassa à família
 * (na matrícula, na agenda do aluno). O aluno entra com esse código e o PIN.
 *
 * - 8 caracteres, sem I, O, 0 e 1 (não confunde na leitura); exibido como ABCD-2345.
 * - Único entre todas as redes: registrado no catálogo (STUDENT_ACCESS), que diz
 *   em qual base o aluno está.
 * - O código de turma do professor é do pacote de extensão de aula e não entra aqui.
 */
import { randomInt } from "crypto";
import { registerCode, findTenantByCode } from "@/lib/escola/catalogo";

export const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TAMANHO_CODIGO = 8;

/** Tira traço, espaço e caixa baixa: "abcd-2345" vira "ABCD2345" */
export function normalizarCodigo(codigo: string): string {
  return String(codigo ?? "").toUpperCase().replace(/[\s-]/g, "");
}

/** "ABCD2345" vira "ABCD-2345" */
export function formatarCodigo(codigo: string | null | undefined): string {
  const c = normalizarCodigo(codigo ?? "");
  return c.length === TAMANHO_CODIGO ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function codigoValido(codigo: string): boolean {
  const c = normalizarCodigo(codigo);
  return c.length === TAMANHO_CODIGO && [...c].every((ch) => ALFABETO_CODIGO.includes(ch));
}

export function gerarCodigo(): string {
  let s = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) s += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return s;
}

/**
 * Devolve o código do aluno, criando um se ainda não tiver.
 * `db` é o cliente da rede do aluno.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function garantirCodigoAluno(db: any, studentId: string, networkId: string): Promise<string | null> {
  const atual = await db.eduStudent.findUnique({ where: { id: studentId }, select: { accessCode: true } });
  if (!atual) return null;
  if (atual.accessCode) {
    // garante o registro no catálogo (aluno criado antes do catálogo conhecer o código)
    if (!(await findTenantByCode(atual.accessCode))) await registerCode("STUDENT_ACCESS", atual.accessCode, networkId);
    return atual.accessCode;
  }
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const codigo = gerarCodigo();
    if (await findTenantByCode(codigo)) continue;
    const r = await db.eduStudent.updateMany({ where: { id: studentId, accessCode: null }, data: { accessCode: codigo } }).catch(() => ({ count: 0 }));
    if (r.count === 0) {
      // outra chamada gravou primeiro, ou o código já existe nesta base
      const de = await db.eduStudent.findUnique({ where: { id: studentId }, select: { accessCode: true } });
      if (de?.accessCode) { await registerCode("STUDENT_ACCESS", de.accessCode, networkId); return de.accessCode; }
      continue;
    }
    await registerCode("STUDENT_ACCESS", codigo, networkId);
    return codigo;
  }
  return null;
}
