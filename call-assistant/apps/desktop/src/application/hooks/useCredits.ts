import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { walletApi, type WalletBalance } from "../../infrastructure/api/walletApi";

export function useCredits() {
  const token = useAuthStore((s) => s.token);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        const data = await walletApi.getBalance(token!);
        if (!cancelled) setBalance(data);
      } catch {
        // silently fail — status bar is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();

    const interval = setInterval(fetch, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  return { balance, loading };
}
