/**
 * Lê uma flag de ambiente de forma tolerante: aceita `true`/`"true"`/`1`/`on`
 * e `false`/`"false"`/`0`/`off`, com aspas simples/duplas, espaços ou
 * maiúsculas. Quando a variável não está definida (ou vazia), usa
 * `defaultValue`. Isso evita que um valor com aspas (FEATURE_ESCOLAS="true",
 * comum no Railway) — ou uma variável ausente — desligue o módulo por engano.
 */
export function envFlag(value: string | undefined | null, defaultValue = false): boolean {
  const v = (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();
  if (v === "") return defaultValue;
  if (["true", "1", "on", "yes", "sim"].includes(v)) return true;
  if (["false", "0", "off", "no", "nao", "não"].includes(v)) return false;
  return defaultValue;
}

// Produto SpeakFlow Escolas: HABILITADO por padrão. Só desliga com
// FEATURE_ESCOLAS=false (ou 0/off) explícito. Assim um deploy sem a variável
// setada não derruba a área escolar inteira (404 em todas as rotas gated).
export function isEscolasEnabled(): boolean {
  return envFlag(process.env.FEATURE_ESCOLAS, true);
}

export function isEscolasPublicEnabled(): boolean {
  return envFlag(process.env.NEXT_PUBLIC_FEATURE_ESCOLAS, true);
}

// Notas continuam DESLIGADAS por padrão (só ligam com FEATURE_ESCOLAS_NOTAS=true).
export function isNotasEnabled(): boolean {
  return envFlag(process.env.FEATURE_ESCOLAS_NOTAS, false);
}
