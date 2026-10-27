import * as SecureStore from "expo-secure-store";
import { API_BASE, APP_CLIENT } from "@/lib/config";

export type Perfil = "staff" | "student" | "family";

const KEY = "sf_edu_session";

export interface Sessao {
  token: string;
  perfil: Perfil;
  staffRedirect?: string; // ex.: /escola/professor (define a tela inicial da equipe)
}

export async function salvarSessao(s: Sessao): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(s));
}

export async function lerSessao(): Promise<Sessao | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Sessao;
    return s?.token && s?.perfil ? s : null;
  } catch {
    return null;
  }
}

export async function limparSessao(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* noop */
  }
}

/** Cabecalhos de autenticacao do app: sempre X-Client; Bearer quando ha sessao. */
export async function authHeaders(): Promise<Record<string, string>> {
  const s = await lerSessao();
  return { "X-Client": APP_CLIENT, ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) };
}

const LOGOUT_PATH: Record<Perfil, string> = {
  staff: "/api/escola/auth/logout",
  student: "/api/escola/aluno/sair",
  family: "/api/escola/familia/sair",
};

/** Sair: avisa o servidor (best-effort) e apaga a sessao do aparelho. */
export async function sair(perfil: Perfil, token?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}${LOGOUT_PATH[perfil]}`, {
      method: "POST",
      headers: { "X-Client": APP_CLIENT, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    /* offline: limpa a sessao local de qualquer forma */
  }
  await limparSessao();
}

/** Tela inicial de cada perfil ao abrir o app ja logado. */
export function rotaInicial(s: Sessao): string {
  if (s.perfil === "student") return "/aluno/trilha";
  if (s.perfil === "family") return "/familia/painel";
  // Equipe: professor usa as telas do app; gestao/coordenacao/direcao vao ao navegador.
  return s.staffRedirect?.includes("/professor") ? "/professor" : "/equipe/navegador";
}
