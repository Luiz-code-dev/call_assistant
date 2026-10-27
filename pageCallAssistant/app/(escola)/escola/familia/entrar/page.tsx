"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake } from "lucide-react";

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

export default function FamiliaLoginPage() {
  const sp = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const aviso = sp.get("redefinida") ? "Senha alterada. Entre com a nova senha." : sp.get("expirou") ? "Sua sessão expirou. Entre de novo." : sp.get("saiu") ? "Você saiu." : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r = await fetch("/api/escola/familia/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, senha }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Não foi possível entrar."); setLoading(false); return; }
      window.location.href = "/escola/familia";
    } catch { setError("Erro de conexão. Tente novamente."); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold">SpeakFlow <span className="text-[#BE185D]">Escolas</span></h1>
          <p className="text-[#5B5470] text-sm mt-1">Área da família</p>
        </div>

        {aviso && <div className="mb-4 text-center text-[13px] text-[#4C1D95] bg-[#EDE9FE] rounded-lg py-2">{aviso}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">E-mail ou celular</label><input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoCapitalize="none" placeholder="seu e-mail ou celular" className={inputCls} /></div>
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Senha</label><input value={senha} onChange={(e) => setSenha(e.target.value)} required type="password" placeholder="Sua senha" className={inputCls} /></div>
          {error && <p className="text-[#B91C1C] text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px]">{loading ? "Entrando..." : "Entrar"}</button>
        </form>

        <div className="mt-4 text-center text-[13px] space-y-1.5">
          <p><a href="/escola/familia/esqueci-senha" className="text-[#6D28D9]">Esqueci minha senha</a></p>
          <p className="text-[#5B5470]">Primeiro acesso? <a href="/escola/familia/primeiro-acesso" className="text-[#6D28D9] font-medium">Use o código do cartão do aluno</a></p>
          <p className="text-[#5B5470]">Recebeu um convite? Use o link do e-mail ou do WhatsApp.</p>
        </div>

        <div className="mt-8 pt-5 border-t border-[#E9E5F5] flex justify-center gap-4 text-[13px] text-[#5B5470]">
          <a href="/escola/aluno/entrar" className="hover:text-[#6D28D9]">Sou aluno</a>
          <span className="text-[#DDD6EE]">·</span>
          <a href="/escola/entrar" className="hover:text-[#6D28D9]">Sou da equipe escolar</a>
        </div>
      </div>
    </div>
  );
}
