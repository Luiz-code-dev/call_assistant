"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake, QrCode } from "lucide-react";

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-2xl px-4 py-3.5 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

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
    <div className="min-h-screen bg-[#F6F4FE] flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[44vh] rounded-b-[40px] bg-gradient-to-br from-[#5B21B6] via-[#6D28D9] to-[#8B5CF6]" aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_12px_40px_rgba(91,33,182,0.18)]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold">SpeakFlow <span className="text-[#BE185D]">Escolas</span></h1>
          <p className="text-[#5B5470] text-sm mt-1">Área da família</p>
        </div>

        {aviso && <div className="mb-4 text-center text-[13px] text-[#4C1D95] bg-[#EDE9FE] rounded-2xl py-2.5">{aviso}</div>}

        <a href="/escola/familia/primeiro-acesso?ler=1" className="mb-5 w-full rounded-2xl border-[1.5px] border-[#DDD6EE] bg-[#F6F4FE] hover:border-[#6D28D9] px-4 py-3 flex items-center gap-3 text-left">
          <span className="w-10 h-10 rounded-xl bg-[#6D28D9] text-white flex items-center justify-center shrink-0"><QrCode className="size-5" /></span>
          <span><span className="block text-[14px] font-bold text-[#1F1A2E]">Primeiro acesso: ler o QR da ficha</span><span className="block text-[12px] text-[#5B5470]">Use a ficha que a escola entregou</span></span>
        </a>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">E-mail ou celular</label><input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoCapitalize="none" placeholder="seu e-mail ou celular" className={inputCls} /></div>
          <div><label className="text-[#1F1A2E] text-sm font-medium block mb-1">Senha</label><input value={senha} onChange={(e) => setSenha(e.target.value)} required type="password" placeholder="Sua senha" className={inputCls} /></div>
          {error && <p className="text-[#B91C1C] text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 min-h-[52px]">{loading ? "Entrando..." : "Entrar"}</button>
        </form>

        <div className="mt-4 text-center text-[13px] space-y-1.5">
          <p><a href="/escola/familia/esqueci-senha" className="text-[#6D28D9]">Esqueci minha senha</a></p>
          <p className="text-[#5B5470]">Primeiro acesso? <a href="/escola/familia/primeiro-acesso" className="text-[#6D28D9] font-medium">Use a ficha que a escola entregou</a></p>
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
