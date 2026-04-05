const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro na requisição");
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (name: string, email: string, password: string) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  },
  wallet: {
    balance: () => request("/wallet/balance"),
    transactions: (page = 0, size = 20) =>
      request(`/wallet/transactions?page=${page}&size=${size}`),
  },
  billing: {
    subscribe: (priceId: string, userEmail: string) =>
      request<{ url: string }>("/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ priceId, userEmail }),
      }),
  },
};
