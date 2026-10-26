export function isEscolasEnabled(): boolean {
  return process.env.FEATURE_ESCOLAS === "true";
}

export function isEscolasPublicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_ESCOLAS === "true";
}

export function isNotasEnabled(): boolean {
  return process.env.FEATURE_ESCOLAS_NOTAS === "true";
}
