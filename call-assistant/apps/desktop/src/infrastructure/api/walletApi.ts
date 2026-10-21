import ky from "ky";

const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";
const BASE_URL = `${BACKEND_ORIGIN}/api`;

function makeHttp(token: string) {
  return ky.create({
    prefixUrl: BASE_URL,
    timeout: 8000,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface WalletBalance {
  balance: number;
  bonusBalance: number;
  trialBalance: number;
  plan: string;
}

export const walletApi = {
  getBalance: (token: string): Promise<WalletBalance> =>
    makeHttp(token).get("wallet/balance").json<WalletBalance>(),
};
