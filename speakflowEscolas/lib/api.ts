import Constants from "expo-constants";

// Base do site/API — o app consome as mesmas rotas /api/escola/* da web,
// garantindo "mesma lógica" que o site.
export const API_BASE =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "https://www.speakflow.ia.br";

export interface EscolaConfig {
  escolasEnabled: boolean;
  familyEnabled: boolean;
  notasEnabled: boolean;
  termsUrl: string;
  privacyUrl: string;
  deleteAccountUrl: string;
  aiProvider: string;
}

export async function fetchConfig(): Promise<EscolaConfig | null> {
  try {
    const r = await fetch(`${API_BASE}/api/escola/config`);
    if (!r.ok) return null;
    return (await r.json()) as EscolaConfig;
  } catch {
    return null;
  }
}

// Wrapper simples; mantém cookies de sessão (equipe/aluno/família) do WebView/app.
export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE}/api/escola${path}`, { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
