import { API_BASE, APP_CLIENT } from "@/lib/config";
import { authHeaders } from "@/lib/session";

export { API_BASE, APP_CLIENT };

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
    const r = await fetch(`${API_BASE}/api/escola/config`, { headers: { "X-Client": APP_CLIENT } });
    if (!r.ok) return null;
    return (await r.json()) as EscolaConfig;
  } catch {
    return null;
  }
}

// Timeout padrao para nao deixar a tela girando pra sempre quando a rede cai.
const REQ_TIMEOUT_MS = 20000;

async function fetchComTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** GET autenticado em /api/escola<path>. Retorna null em erro (nunca lanca). */
export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const r = await fetchComTimeout(`${API_BASE}/api/escola${path}`, { headers: await authHeaders() });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * POST/PUT em /api/escola<path>. Por padrao envia Bearer (quando ha sessao);
 * para o login use `auth: false` (ainda nao ha token, mas o X-Client vai junto).
 */
export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  opts?: { auth?: boolean }
): Promise<ApiResult<T>> {
  try {
    const base = opts?.auth === false ? { "X-Client": APP_CLIENT } : await authHeaders();
    const headers: Record<string, string> = { ...base };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await fetchComTimeout(`${API_BASE}/api/escola${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: T | null = null;
    try { data = (await r.json()) as T; } catch { /* sem corpo */ }
    const error = !r.ok ? ((data as { error?: string } | null)?.error ?? "Nao foi possivel completar a acao.") : undefined;
    return { ok: r.ok, status: r.status, data, error };
  } catch {
    return { ok: false, status: 0, data: null, error: "Erro de conexao. Tente de novo." };
  }
}
