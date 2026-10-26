/**
 * Lê uma flag de ambiente de forma tolerante: aceita `true`, `"true"`,
 * com aspas simples/duplas, espaços ou maiúsculas. Evita que um valor como
 * FEATURE_ESCOLAS="true" (com aspas literais, comum no Railway) desligue o
 * módulo por engano.
 */
export function envFlag(value: string | undefined | null): boolean {
  if (!value) return false;
  return value.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase() === "true";
}

export function isEscolasEnabled(): boolean {
  return envFlag(process.env.FEATURE_ESCOLAS);
}

export function isEscolasPublicEnabled(): boolean {
  return envFlag(process.env.NEXT_PUBLIC_FEATURE_ESCOLAS);
}

export function isNotasEnabled(): boolean {
  return envFlag(process.env.FEATURE_ESCOLAS_NOTAS);
}
