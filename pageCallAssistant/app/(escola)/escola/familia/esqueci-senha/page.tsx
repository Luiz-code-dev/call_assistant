"use client";
import { useState } from "react";
import { HeartHandshake, KeyRound, MailCheck } from "lucide-react";

const inputCls = "w-full bg-white text-[#1F1A2E] rounded-xl px-4 py-3 border-[1.5px] border-[#DDD6EE] focus:border-[#6D28D9] focus:ring-[3px] focus:ring-[#EDE9FE] outline-none text-sm";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/escola/familia/esqueci-senha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json().catch(() => ({}));
      setMessage(data.message ?? "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.");
      setSent(true);
    } catch {
      setMessage("Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.");
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-3"><HeartHandshake size={28} className="text-[#6D28D9]" /></div>
          <h1 className="text-[#1F1A2E] text-2xl font-bold mb-1">Esqueci minha senha</h1>
          <p className="text-[#5B5470] text-sm">Digite o e-mail da sua conta da Área da família.</p>
        </div>

        {sent ? (
          <div className="bg-white border border-[#E9E5F5] rounded-2xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] flex items-center justify-center mx-auto"><MailCheck size={24} className="text-[#166534]" /></div>
            <p className="text-[14px] text-[#1F1A2E]">{message}</p>
            <p className="text-[12px] text-[#5B5470]">O link vale por 1 hora. Veja também a caixa de spam.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[#1F1A2E] text-sm font-medium block mb-1">E-mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" autoCapitalize="none" placeholder="seu e-mail" className={inputCls} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 min-h-[48px]">{loading ? "Enviando..." : "Enviar link de redefinição"}</button>
          </form>
        )}

        <div className="mt-5 bg-white border border-[#E9E5F5] rounded-2xl p-5 text-left">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="text-[#6D28D9] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#1F1A2E]">Só tem celular, sem e-mail? Peça à escola um <b>novo código de família</b> do cartão do aluno e use o <a href="/escola/familia/primeiro-acesso" className="text-[#6D28D9] font-medium">Primeiro acesso</a> para criar uma nova senha.</p>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/escola/familia/entrar" className="text-[13px] text-[#6D28D9]">Voltar para entrar</a>
        </div>
      </div>
    </div>
  );
}
