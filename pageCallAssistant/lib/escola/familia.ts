import { createHash, randomInt } from "crypto";

/** Alfabeto do código de família: sem caracteres ambíguos (0/O, 1/I, etc.). */
export const FAMILY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const FAMILY_CODE_LENGTH = 8;
export const FAMILY_CODE_TTL_DAYS = 120;
export const FAMILY_CODE_ACTIVATIONS = 3;

/** Relações de parentesco válidas (EduGuardianRelation). */
export const GUARDIAN_RELATIONS = ["MAE", "PAI", "AVO_AVO", "TIO_TIA", "TUTOR_LEGAL", "OUTRO"] as const;
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];
export function isGuardianRelation(v: unknown): v is GuardianRelation {
  return typeof v === "string" && (GUARDIAN_RELATIONS as readonly string[]).includes(v);
}

/** Máximo de responsáveis ativos por aluno. */
export const MAX_GUARDIANS_PER_STUDENT = 4;

export function genFamilyCode(): string {
  let c = "";
  for (let i = 0; i < FAMILY_CODE_LENGTH; i++) c += FAMILY_CODE_ALPHABET[randomInt(FAMILY_CODE_ALPHABET.length)];
  return c;
}

/** Normaliza o código digitado: remove espaços/hífens, maiúsculas. */
export function normalizeFamilyCode(input: string): string {
  return (input ?? "").replace(/[\s-]/g, "").toUpperCase();
}

/** Hash determinístico (SHA-256) do código normalizado — permite busca O(1). */
export function hashFamilyCode(input: string): string {
  return createHash("sha256").update(normalizeFamilyCode(input)).digest("hex");
}

/** Compara duas datas de nascimento apenas por ano/mês/dia (ignora hora/fuso). */
export function sameBirthDate(a: Date | string | null | undefined, b: Date | string | null | undefined): boolean {
  const norm = (d: Date | string | null | undefined): string | null => {
    if (!d) return null;
    if (typeof d === "string") {
      const m = d.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  };
  const na = norm(a); const nb = norm(b);
  return na !== null && na === nb;
}
