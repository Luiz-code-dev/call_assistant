import { useEffect } from "react";
import { Globe } from "lucide-react";
import { useAuthStore } from "../../application/store/authStore";


export function LoginPage() {
  const { openBrowserLogin, setToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const unsubscribe = window.electronAPI.auth.onTokenReceived(({ token }) => {
      // Token is already a 30-day desktop-session token — use directly
      setToken(token);
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

      <button
        onClick={openBrowserLogin}
        className="flex items-center gap-3 rounded-xl bg-violet-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-500/20"
      >
        <Globe className="h-4 w-4" />
        Sign in with browser
      </button>

      <p className="mt-6 text-xs text-zinc-600 max-w-xs">
        Your browser will open to sign in securely.
        You'll be redirected back to the app automatically.
      </p>
    </div>
  );
}
