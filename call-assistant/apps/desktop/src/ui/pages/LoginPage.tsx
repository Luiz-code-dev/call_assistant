import { useEffect, useState } from "react";
import { Mic2, Globe, Loader2 } from "lucide-react";
import { useAuthStore } from "../../application/store/authStore";

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL ?? "https://www.call-assistant.com.br";

export function LoginPage() {
  const { openBrowserLogin, setToken, isAuthenticated } = useAuthStore();
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.auth.onTokenReceived(async ({ token }) => {
      setExchanging(true);
      setError(null);
      try {
        // Exchange the 5-min transport token for a 30-day session token
        const res = await fetch(`${WEB_APP_URL}/api/auth/desktop-exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json() as { token?: string; message?: string };
        if (!res.ok || !data.token) {
          throw new Error(data.message ?? "Token exchange failed");
        }
        setToken(data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      } finally {
        setExchanging(false);
      }
    });
    return () => unsubscribe();
  }, [setToken]);

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.12),transparent)]" />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-6 shadow-lg shadow-blue-500/25">
        <span className="text-2xl font-bold text-white">S</span>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">SpeakFlow</h1>
      <p className="text-sm text-zinc-400 mb-10 max-w-xs">
        Entenda em tempo real. Responda com confiança.
      </p>

      {exchanging ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p className="text-sm text-zinc-400">Completing sign in…</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 max-w-xs">
              {error}
            </div>
          )}
          <button
            onClick={openBrowserLogin}
            className="flex items-center gap-3 rounded-xl bg-violet-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-500/20"
          >
            <Globe className="h-4 w-4" />
            {error ? "Try again" : "Sign in with browser"}
          </button>

          <p className="mt-6 text-xs text-zinc-600 max-w-xs">
            Your browser will open to sign in securely.
            You'll be redirected back to the app automatically.
          </p>
        </>
      )}
    </div>
  );
}
