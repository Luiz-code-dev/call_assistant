import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@shared/constants/config";
import { TokenStorage } from "@infrastructure/storage/TokenStorage";
import type { Result } from "@shared/types";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * ApiClient — cliente HTTP centralizado.
 *
 * Responsabilidades:
 *  - Adicionar Bearer token em todas as requisições
 *  - Timeout configurável
 *  - Mapear erros HTTP para Result<T, ApiError>
 *  - Nunca expor tokens fora desta classe
 */
export class ApiClient {
  private static async buildHeaders(skipAuth = false): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (!skipAuth) {
      const token = await TokenStorage.get();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private static async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<Result<T>> {
    const url = `${API_BASE_URL}${path}`;
    const headers = await ApiClient.buildHeaders(options.skipAuth);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers: { ...headers, ...(options.headers ?? {}) },
        body: options.body != null ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        const message =
          (errorData.error as string) ??
          (errorData.message as string) ??
          `Erro ${response.status}`;
        return { ok: false, error: { message, statusCode: response.status } };
      }

      const data = (await response.json()) as T;
      return { ok: true, data };
    } catch (err) {
      clearTimeout(timeout);

      const errMsg = (err as Error)?.message ?? String(err);
      console.error(`[ApiClient] fetch error → ${url}:`, errMsg);

      if ((err as Error).name === "AbortError") {
        return {
          ok: false,
          error: { message: "Tempo limite da requisição esgotado.", statusCode: 408 },
        };
      }

      return {
        ok: false,
        error: {
          message: `Erro de conexão: ${errMsg}`,
          statusCode: 0,
        },
      };
    }
  }

  static get<T>(path: string, opts?: RequestOptions): Promise<Result<T>> {
    return ApiClient.request<T>("GET", path, opts);
  }

  static post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<Result<T>> {
    return ApiClient.request<T>("POST", path, { ...opts, body });
  }

  static patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<Result<T>> {
    return ApiClient.request<T>("PATCH", path, { ...opts, body });
  }

  static put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<Result<T>> {
    return ApiClient.request<T>("PUT", path, { ...opts, body });
  }

  static delete<T>(path: string, opts?: RequestOptions): Promise<Result<T>> {
    return ApiClient.request<T>("DELETE", path, opts);
  }
}
