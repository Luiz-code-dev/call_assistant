"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

interface InviteInfo {
  id: string; name: string; email: string; role: string;
  networkName: string; expiresAt: string; hasAccount: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  NETWORK_ADMIN: "Gestor da Rede", COORDINATOR: "Coordenador(a)",
  SCHOOL_ADMIN: "Diretor(a)", TEACHER: "Professor(a)",
};

export default function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/escola/convite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInvite(data);
        setLoading(false);
      });
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite?.hasAccount && password !== confirm) { setError("As senhas não coincidem"); return; }
    if (!invite?.hasAccount && password.length < 8) { setError("Senha deve ter ao menos 8 caracteres"); return; }
    setSubmitting(true); setError("");
    const r = await fetch(`/api/escola/convite/${token}/aceitar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, acceptTerms }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error); setSubmitting(false); return; }
    router.push(data.redirect ?? "/escola/painel");
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Carregando...</div>;

  if (error && !invite) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-white font-bold text-lg mb-2">Convite inválido</h1>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-700/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-white font-bold text-xl">Você foi convidado(a)!</h1>
          <p className="text-gray-400 text-sm mt-1">
            Para <span className="text-purple-400 font-medium">{invite?.networkName}</span> como{" "}
            <span className="text-white">{ROLE_LABEL[invite?.role ?? ""] ?? invite?.role}</span>
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg px-4 py-3 mb-6">
          <div className="text-gray-500 text-xs">Nome</div>
          <div className="text-white font-medium">{invite?.name}</div>
          <div className="text-gray-400 text-sm">{invite?.email}</div>
        </div>

        <form onSubmit={accept} className="space-y-4">
          {!invite?.hasAccount && (
            <>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Criar senha *</label>
                <input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-3 text-base border border-gray-700 focus:border-purple-500 outline-none" required />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Confirmar senha *</label>
                <input type="password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-3 text-base border border-gray-700 focus:border-purple-500 outline-none" required />
              </div>
            </>
          )}
          {invite?.hasAccount && (
            <p className="text-gray-400 text-sm bg-gray-800 rounded-lg p-3">
              Sua conta SpeakFlow já existe. Ao aceitar, o vínculo escolar será adicionado.
            </p>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
              className="w-5 h-5 accent-purple-600 mt-0.5 shrink-0" required />
            <span className="text-gray-400 text-sm">Aceito os <span className="text-purple-400 underline cursor-pointer">termos de uso</span> e a política de privacidade</span>
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting || !acceptTerms} className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl min-h-[44px] text-base transition-colors">
            {submitting ? "Processando..." : "Aceitar convite"}
          </button>
        </form>
      </div>
    </div>
  );
}
