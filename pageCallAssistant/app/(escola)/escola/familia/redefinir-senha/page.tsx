"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake } from "lucide-react";

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

function RedefinirInner() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (senha.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (senha !== confirma) { setError("As senhas não são iguais."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/escola/familia/redefinir-senha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data.error ?? "Não foi possível redefinir a senha."); setLoading(false); return; }
      window.location.href = "/escola/familia/entrar?redefinida=1";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1">Criar nova senha</h1>
          <p className="text-[#5B5470] text-sm">Escolha uma senha para a Área da família.</p>
        </div>

        {!token ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 text-center space-y-3">
            <p className="text-[14px] text-[#1F1A2E]">Link inválido ou expirado.</p>
            <a href="/escola/familia/esqueci-senha" className="inline-block text-[13px] text-[#6D28D9] font-medium">Pedir um novo link</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Nova senha</label>
              <input value={senha} onChange={(e) => setSenha(e.target.value)} required type="password" placeholder="Pelo menos 6 caracteres" className={inputCls} />
            </div>
            <div>
              <label className="text-[#1F1A2E] text-sm font-medium block mb-1">Confirmar senha</label>
              <input value={confirma} onChange={(e) => setConfirma(e.target.value)} required type="password" placeholder="Repita a senha" className={inputCls} />
            </div>
            {error && <p className="text-[#B91C1C] text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px]">{loading ? "Salvando..." : "Salvar nova senha"}</button>
          </form>
        )}

        <div className="text-center mt-6">
          <a href="/escola/familia/entrar" className="text-[13px] text-[#6D28D9]">Voltar para entrar</a>
        </div>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirInner />
    </Suspense>
  );
}
